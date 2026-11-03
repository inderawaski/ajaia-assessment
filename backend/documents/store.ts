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

export async function createDocument(ownerId: string) {
  const { rows } = await db.query<Pick<Document, "id">>(
    "INSERT INTO documents (owner_id) VALUES ($1) RETURNING id",
    [ownerId],
  );
  return rows[0];
}

export async function readDocument(ownerId: string, id: string) {
  const { rows } = await db.query<Document>(
    "SELECT id, title, body, revision FROM documents WHERE owner_id = $1 AND id = $2",
    [ownerId, id],
  );
  return rows[0];
}

export async function saveDocumentBody(ownerId: string, id: string, body: JSONContent, revision: number) {
  const { rows } = await db.query<Pick<Document, "revision">>(
    `UPDATE documents SET body = $3, revision = revision + 1
     WHERE owner_id = $1 AND id = $2 AND revision = $4
     RETURNING revision`,
    [ownerId, id, JSON.stringify(body), revision],
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
