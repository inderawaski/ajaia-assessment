import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, test } from "node:test";

const { origin, hostname } = new URL(process.env.TEST_APP_URL ?? "http://localhost:3000");

async function request(path, { method = "GET", cookie, data, status } = {}) {
  const response = await fetch(origin + path, {
    method,
    redirect: "manual",
    headers: {
      Origin: origin,
      ...(hostname === "localhost" || hostname === "127.0.0.1" && { "X-Forwarded-For": "127.0.0.1" }),
      ...(cookie && { Cookie: cookie }),
      ...(data !== undefined && { "Content-Type": "application/json" }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (status !== undefined) assert.equal(response.status, status, `${method} ${path}`);
  return response;
}

async function account(email = `smoke-${randomUUID()}@example.com`) {
  const password = randomUUID();
  const signup = await request("/api/auth/sign-up/email", {
    method: "POST", data: { name: "Smoke test", email, password }, status: 200,
  });
  assert.ok(signup.headers.get("set-cookie"), "signup establishes a session");
  const signin = await request("/api/auth/sign-in/email", {
    method: "POST", data: { email, password }, status: 200,
  });
  const cookie = signin.headers.getSetCookie().find((value) => value.includes("session_token="));
  assert.ok(cookie, "signin establishes a session");
  return { email, cookie: cookie.split(";")[0] };
}

let owner;
let unrelated;

before(async () => {
  ({ cookie: owner } = await account());
  ({ cookie: unrelated } = await account());
});

test("only the owner can reopen and update a private document", async () => {
  await request("/api/documents", { method: "POST", data: {}, status: 401 });
  const created = await request("/api/documents", { method: "POST", cookie: owner, data: {}, status: 201 });
  const { id } = await created.json();
  const api = `/api/documents/${id}`;
  const page = `/documents/${id}`;
  const dashboard = await request("/dashboard", { cookie: owner, status: 200 });
  assert.ok((await dashboard.text()).includes(page));
  const unrelatedDashboard = await request("/dashboard", { cookie: unrelated, status: 200 });
  assert.ok(!(await unrelatedDashboard.text()).includes(page));

  const initial = await request(api, { cookie: owner, status: 200 });
  assert.deepEqual(await initial.json(), {
    id, title: "Untitled document", revision: 0,
    body: { type: "doc", content: [{ type: "paragraph" }] },
  });
  const text = `Private content ${randomUUID()}`;
  const body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
  const titleApi = `${api}/title`;
  const rename = { method: "PATCH", data: { title: "  Formatted document  " } };
  await request(titleApi, { ...rename, status: 401 });
  await request(titleApi, { ...rename, cookie: unrelated, status: 404 });
  await request(titleApi, { ...rename, cookie: owner, data: { title: "   " }, status: 400 });
  assert.deepEqual(await (await request(api, { cookie: owner, status: 200 })).json(), {
    id, title: "Untitled document", revision: 0,
    body: { type: "doc", content: [{ type: "paragraph" }] },
  });

  const data = { body, revision: 0 };
  await request(api, { status: 401 });
  await request(api, { method: "PATCH", data, status: 401 });
  await request(api, { cookie: unrelated, status: 404 });
  await request(api, { method: "PATCH", cookie: unrelated, data, status: 404 });
  await request(api, { method: "PATCH", cookie: owner, data: { ...data, body: {} }, status: 400 });

  const writes = await Promise.all([
    request(api, { method: "PATCH", cookie: owner, data }),
    request(api, { method: "PATCH", cookie: owner, data }),
  ]);
  assert.deepEqual(writes.map((response) => response.status).sort(), [200, 409]);

  const renamed = await request(titleApi, { ...rename, cookie: owner, status: 200 });
  assert.deepEqual(await renamed.json(), { title: "Formatted document" });
  const reopened = await request(api, { cookie: owner, status: 200 });
  assert.deepEqual(await reopened.json(), { id, title: "Formatted document", revision: 1, body });
  const ownerPage = await request(page, { cookie: owner, status: 200 });
  assert.ok((await ownerPage.text()).includes(text));
  const deniedPage = await request(page, { cookie: unrelated });
  const deniedHtml = await deniedPage.text();
  assert.ok(!deniedHtml.includes(text));
  assert.match(deniedHtml, /NEXT_HTTP_ERROR_FALLBACK;404|This page could not be found/);
});

test("an owner can grant and revoke a recipient's editing access", async () => {
  const created = await request("/api/documents", { method: "POST", cookie: owner, data: {}, status: 201 });
  const { id } = await created.json();
  const api = `/api/documents/${id}`;
  const page = `/documents/${id}`;
  const grants = `${api}/grants`;
  const text = `Shared content ${randomUUID()}`;
  const body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
  const email = `smoke-${randomUUID()}@example.com`;
  const grant = { method: "POST", data: { email } };
  const revoke = { method: "DELETE", data: grant.data };

  async function checkDenied(cookie, revision) {
    await request(api, { cookie, status: 404 });
    await request(api, { method: "PATCH", cookie, data: { body, revision }, status: 404 });
    const dashboard = await request("/dashboard", { cookie, status: 200 });
    assert.ok(!(await dashboard.text()).includes(page));
    const denied = await request(page, { cookie });
    const html = await denied.text();
    assert.ok(!html.includes(text));
    assert.match(html, /NEXT_HTTP_ERROR_FALLBACK;404|This page could not be found/);
  }

  await checkDenied(unrelated, 0);
  await request(grants, { ...grant, status: 401 });
  await Promise.all([
    request(grants, { ...grant, cookie: owner, status: 204 }),
    request(grants, { ...grant, cookie: owner, data: { email: ` ${email.toUpperCase()} ` }, status: 204 }),
  ]);
  assert.deepEqual(await (await request(grants, { cookie: owner, status: 200 })).json(), {
    emails: [email],
  });

  const recipient = await account(email);
  for (const cookie of [recipient.cookie, unrelated]) {
    await request(grants, { cookie, status: 404 });
    await request(grants, { ...grant, cookie, status: 404 });
    await request(grants, { ...revoke, cookie, status: 404 });
    await request(`${api}/title`, { method: "PATCH", cookie, data: { title: "Denied" }, status: 404 });
  }
  const dashboard = await request("/dashboard", { cookie: recipient.cookie, status: 200 });
  assert.ok((await dashboard.text()).includes(`href="${page}"`));
  const opened = await request(api, { cookie: recipient.cookie, status: 200 });
  const { revision } = await opened.json();
  const save = { method: "PATCH", cookie: recipient.cookie, data: { body, revision } };
  await request(api, { ...save, status: 200 });
  await request(api, { ...save, status: 409 });
  const sharedPage = await request(page, { cookie: recipient.cookie, status: 200 });
  const html = await sharedPage.text();
  assert.ok(html.includes(text));
  assert.ok(!html.includes("Share editing access"));
  assert.deepEqual((await (await request(api, { cookie: owner, status: 200 })).json()).body, body);
  await checkDenied(unrelated, revision + 1);

  await request(grants, { ...revoke, cookie: owner, status: 204 });
  assert.deepEqual(await (await request(grants, { cookie: owner, status: 200 })).json(), { emails: [] });
  await checkDenied(recipient.cookie, revision + 1);
  await checkDenied(unrelated, revision + 1);
});

test("both import formats create private documents that can be edited and reopened", async () => {
  async function upload(files, cookie, status) {
    const body = new FormData();
    for (const file of files) body.append("file", file);
    const response = await fetch(origin + "/api/documents/import", {
      method: "POST",
      headers: { "X-Document-Import": "1", ...(cookie && { Cookie: cookie }) },
      body,
    });
    assert.equal(response.status, status);
    return response.json();
  }

  const textFile = new File(["First paragraph\n\nSecond paragraph"], "Imported text.txt");
  const markdownFile = new File(["# Imported heading\n\n**Bold** and *italic*"], "Imported Markdown.md");
  const dashboardBefore = await request("/dashboard", { cookie: owner, status: 200 });
  const documentLinks = (html) => html.match(/href="\/documents\/[^"]+"/g) ?? [];
  const before = documentLinks(await dashboardBefore.text());

  await upload([textFile], undefined, 401);
  await upload([textFile, markdownFile], owner, 400);
  await upload([new File([Uint8Array.of(255)], "Invalid.md")], owner, 400);
  const dashboardAfter = await request("/dashboard", { cookie: owner, status: 200 });
  assert.deepEqual(documentLinks(await dashboardAfter.text()), before);

  for (const [file, title, firstNodeType] of [
    [textFile, "Imported text", "paragraph"],
    [markdownFile, "Imported Markdown", "heading"],
  ]) {
    const { id } = await upload([file], owner, 201);
    const page = `/documents/${id}`;
    const api = `/api${page}`;
    const opened = await (await request(api, { cookie: owner, status: 200 })).json();
    assert.equal(opened.title, title);
    assert.equal(opened.body.content[0].type, firstNodeType);
    await request(api, { cookie: unrelated, status: 404 });

    const body = opened.body;
    body.content.push({ type: "paragraph", content: [{ type: "text", text: "Edited after import" }] });
    await request(api, { method: "PATCH", cookie: owner, data: { body, revision: opened.revision }, status: 200 });
    const editor = await request(page, { cookie: owner, status: 200 });
    assert.match(await editor.text(), /Edited after import/);
    const reopened = await (await request(api, { cookie: owner, status: 200 })).json();
    assert.deepEqual(reopened.body.content[0], body.content[0]);
    assert.deepEqual(reopened.body.content.at(-1), body.content.at(-1));

    const dashboard = await request("/dashboard", { cookie: owner, status: 200 });
    assert.ok(documentLinks(await dashboard.text()).includes(`href="${page}"`));
    const unrelatedDashboard = await request("/dashboard", { cookie: unrelated, status: 200 });
    assert.ok(!documentLinks(await unrelatedDashboard.text()).includes(`href="${page}"`));
  }
});
