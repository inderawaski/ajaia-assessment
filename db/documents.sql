BEGIN;

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES "user"(id),
  title text NOT NULL DEFAULT 'Untitled document',
  body jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0)
);

CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents (owner_id);

CREATE TABLE IF NOT EXISTS document_grants (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  PRIMARY KEY (document_id, recipient_email)
);

-- Preserve grants created by the previous user-ID schema.
LOCK TABLE document_grants IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'document_grants'::regclass
      AND attname = 'recipient_id' AND NOT attisdropped
  ) THEN
    ALTER TABLE document_grants ADD COLUMN recipient_email text;

    UPDATE document_grants AS grant_row
    SET recipient_email = lower(account.email)
    FROM "user" AS account
    WHERE account.id = grant_row.recipient_id;

    ALTER TABLE document_grants
      DROP COLUMN recipient_id,
      ADD PRIMARY KEY (document_id, recipient_email);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS document_grants_email_idx ON document_grants (recipient_email);

COMMIT;
