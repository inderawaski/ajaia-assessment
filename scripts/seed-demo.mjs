import { Pool } from "pg";

const { DATABASE_URL, BETTER_AUTH_URL, DEMO_OWNER_PASSWORD, DEMO_RECIPIENT_PASSWORD } = process.env;

if (!DATABASE_URL || !BETTER_AUTH_URL ||
    [DEMO_OWNER_PASSWORD, DEMO_RECIPIENT_PASSWORD].some((password) => !password || password.length < 12)) {
  throw new Error("Set DATABASE_URL, BETTER_AUTH_URL, and both demo passwords (at least 12 characters).");
}

const { origin, protocol, hostname } = new URL(BETTER_AUTH_URL);
if (protocol !== "https:" && !(protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(hostname))) {
  throw new Error("Use an HTTPS app origin or a local loopback URL.");
}
const pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 10_000 });

async function authRequest(action, data) {
  return fetch(`${origin}/api/auth/${action}/email`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function ensureAccount(name, email, password) {
  const existing = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
  if (!existing.rowCount) {
    // A concurrent seed may win the signup. The sign-in below verifies the result.
    const signup = await authRequest("sign-up", { name, email, password });
    await signup.body?.cancel();
  }

  const response = await authRequest("sign-in", { email, password });
  if (!response.ok) {
    throw new Error(`Sign-in failed for ${email} (HTTP ${response.status}). Check the demo password and app configuration.`);
  }

  const { user } = await response.json();
  const match = await pool.query('SELECT id FROM "user" WHERE id = $1 AND email = $2', [user.id, email]);
  if (!match.rowCount) {
    throw new Error("DATABASE_URL and BETTER_AUTH_URL must point to the same environment.");
  }
  return user.id;
}

const recipientEmail = "reviewer-b@example.com";
const sharedId = "a3b1568b-cf23-42a6-9d68-e9c92af66e97";
const privateId = "e883eb33-e2ad-4499-a871-dc0cfbfc5510";
const documents = [
  {
    id: sharedId,
    title: "Reviewer walkthrough",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Shared editing" }] },
      { type: "paragraph", content: [
        { type: "text", marks: [{ type: "bold" }], text: "Reviewer B" },
        { type: "text", text: " can edit this document and Reviewer A can reload to see the changes." },
      ] },
    ],
  },
  {
    id: privateId,
    title: "Private reviewer notes",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Only Reviewer A can open this document until access is granted." }] }],
  },
];

try {
  const ownerId = await ensureAccount("Reviewer A", "reviewer-a@example.com", DEMO_OWNER_PASSWORD);
  await ensureAccount("Reviewer B", recipientEmail, DEMO_RECIPIENT_PASSWORD);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const { id, title, content } of documents) {
      await client.query(
        "INSERT INTO documents (id, owner_id, title, body) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
        [id, ownerId, title, { type: "doc", content }],
      );
      const owned = await client.query("SELECT id FROM documents WHERE id = $1 AND owner_id = $2", [id, ownerId]);
      if (!owned.rowCount) throw new Error(`Seed document ${id} belongs to another account.`);
    }
    await client.query(
      "INSERT INTO document_grants (document_id, recipient_email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [sharedId, recipientEmail],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  console.log(`Shared document: ${origin}/documents/${sharedId}`);
  console.log(`Private demo document: ${origin}/documents/${privateId}`);
} finally {
  await pool.end();
}
