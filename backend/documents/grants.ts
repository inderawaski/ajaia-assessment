import { db } from "@/backend/db";

export async function listDocumentGrants(ownerId: string, id: string) {
  const { rows } = await db.query<{ emails: string[] }>(
    `SELECT ARRAY(
       SELECT recipient_email FROM document_grants
       WHERE document_id = documents.id ORDER BY recipient_email
     ) AS emails FROM documents WHERE id = $2 AND owner_id = $1`,
    [ownerId, id],
  );
  return rows[0]?.emails;
}

export async function grantDocumentAccess(ownerId: string, id: string, email: string) {
  const { rowCount } = await db.query(
    `WITH target AS (
       SELECT id FROM documents WHERE id = $2 AND owner_id = $1
     ), inserted AS (
       INSERT INTO document_grants (document_id, recipient_email)
       SELECT id, $3 FROM target
       ON CONFLICT (document_id, recipient_email) DO NOTHING
     )
     SELECT id FROM target`,
    [ownerId, id, email],
  );
  return rowCount === 1;
}

export async function revokeDocumentAccess(ownerId: string, id: string, email: string) {
  const { rowCount } = await db.query(
    `WITH target AS (
       SELECT id FROM documents WHERE id = $2 AND owner_id = $1
     ), removed AS (
       DELETE FROM document_grants USING target
       WHERE document_id = target.id AND recipient_email = $3
     )
     SELECT id FROM target`,
    [ownerId, id, email],
  );
  return rowCount === 1;
}
