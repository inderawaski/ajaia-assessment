import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const origin = new URL(process.env.TEST_APP_URL ?? "http://localhost:3000").origin;

async function request(path, { method = "GET", cookie, data, status } = {}) {
  const response = await fetch(origin + path, {
    method,
    redirect: "manual",
    headers: {
      Origin: origin,
      ...(cookie && { Cookie: cookie }),
      ...(data !== undefined && { "Content-Type": "application/json" }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (status !== undefined) assert.equal(response.status, status, `${method} ${path}`);
  return response;
}

async function account() {
  const email = `smoke-${randomUUID()}@example.com`;
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
  return cookie.split(";")[0];
}

test("only the owner can reopen and update a private document", async () => {
  const owner = await account();
  const unrelated = await account();
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
