CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES "user"(id),
  title text NOT NULL DEFAULT 'Untitled document',
  body jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0)
);

CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents (owner_id);
