import type { JSONContent } from "@tiptap/core";
import { db } from "@/backend/db";

type Document = {
  id: string;
  title: string;
  body: JSONContent;
  revision: number;
};

export async function listOwnedDocuments(ownerId: string) {
  const result = await db.query<Pick<Document, "id" | "title">>(
    "SELECT id, title FROM documents WHERE owner_id = $1 ORDER BY title, id",
    [ownerId],
  );
  return result.rows;
}

export async function listSharedDocuments(email: string) {
  const { rows } = await db.query<Pick<Document, "id" | "title">>(
    `SELECT documents.id, documents.title FROM document_grants
     JOIN documents ON documents.id = document_grants.document_id
     WHERE recipient_email = $1 ORDER BY documents.title, documents.id`,
    [email.toLowerCase()],
  );
  return rows;
}

export async function createDocument(ownerId: string) {
  const { rows } = await db.query<Pick<Document, "id">>(
    "INSERT INTO documents (owner_id) VALUES ($1) RETURNING id",
    [ownerId],
  );
  return rows[0];
}

export async function createImportedDocument(ownerId: string, title: string, body: JSONContent) {
  const { rows } = await db.query<Pick<Document, "id">>(
    "INSERT INTO documents (owner_id, title, body) VALUES ($1, $2, $3) RETURNING id",
    [ownerId, title, JSON.stringify(body)],
  );
  return rows[0];
}

export async function readDocument(user: { id: string; email: string }, id: string) {
  const { rows } = await db.query<Document & { canRename: boolean; ownerName: string }>(
    `SELECT d.id, d.title, d.body, d.revision, d.owner_id = $1 AS "canRename", owner.name AS "ownerName"
     FROM documents d JOIN "user" owner ON owner.id = d.owner_id
     WHERE d.id = $2 AND (d.owner_id = $1 OR EXISTS (
       SELECT 1 FROM document_grants WHERE document_id = $2 AND recipient_email = $3
     ))`,
    [user.id, id, user.email.toLowerCase()],
  );
  return rows[0];
}

export async function saveDocumentBody(user: { id: string; email: string }, id: string, body: JSONContent, revision: number) {
  const { rows } = await db.query<Pick<Document, "revision">>(
    `UPDATE documents SET body = $3, revision = revision + 1
     WHERE id = $2 AND revision = $4 AND (owner_id = $1 OR EXISTS (
       SELECT 1 FROM document_grants WHERE document_id = $2 AND recipient_email = $5 FOR KEY SHARE
     ))
     RETURNING revision`,
    [user.id, id, JSON.stringify(body), revision, user.email.toLowerCase()],
  );
  return rows[0];
}

export async function renameOwnedDocument(ownerId: string, id: string, title: string) {
  const { rows } = await db.query<Pick<Document, "title">>(
    "UPDATE documents SET title = $3 WHERE owner_id = $1 AND id = $2 RETURNING title",
    [ownerId, id, title],
  );
  return rows[0];
}
