# Ajaia Assessment

Sign up with email and password to create and edit Tiptap documents. Owners can grant and revoke editing access by email before or after the recipient signs up. Recipients open granted documents from **Shared with me**.

## Application structure

- `app` contains Next.js pages, layouts, and API route handlers.
- `frontend` contains interactive React components grouped by feature.
- `backend` contains server-side authentication, session checks, and database access.
- `shared` contains document content definitions used by both sides.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env`. Set `DATABASE_URL` to the pooled Postgres connection string from the Neon **Connect** dialog. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Set `BETTER_AUTH_URL` to the app origin.
3. Initialize the Better Auth tables with `npx auth@latest migrate --config backend/auth.ts`.
4. Apply `db/documents.sql` to the same database using the Neon SQL Editor or `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/documents.sql` after exporting `DATABASE_URL` in your shell.
   For an existing installation, reapply this file with the updated app to migrate existing grants from account IDs to email addresses.
5. Run `npm run dev` and open http://localhost:3000.

Run `npm run lint`, `npx next typegen && npx tsc --noEmit`, and `npm run build` to check the project. If a restricted local environment prevents the Turbopack CSS worker from binding to a port, `npm run build -- --webpack` can verify compilation and serve the app for functional checks.

## Vercel setup

Import or link this project in Vercel as a Next.js app. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` for the target environment. Use the stable deployment origin for `BETTER_AUTH_URL`. Run both initialization steps above against the target Neon database before testing the deployment.

## Verify document access

On the target URL, sign up, create an **Untitled document**, enter text, and pause to let autosave run. Wait for **Saved**, then refresh and reopen from **Owned**. Confirm the title and text persist. Copy the document URL and open it from a separate browser session signed in as another account. Confirm the other account cannot find or open the document.

Run `TEST_APP_URL=http://localhost:3000 node --test tests/private-documents.test.mjs` against a running app with a dedicated test database. The suite checks private document persistence, revision conflicts, and access with owner, recipient, and unrelated accounts including grants created before signup and access denied after revocation.

The server derives ownership from the Better Auth session. Postgres stores the body as Tiptap JSON and checks ownership or a current grant and the expected revision in the same update that advances the revision. Failed saves preserve the in-memory draft. The editor warns before leaving with unsaved edits where the browser supports it.

## Setup references

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Neon with Next.js](https://neon.com/docs/guides/nextjs)
- [Better Auth Next.js integration](https://www.better-auth.com/docs/integrations/next)
- [Tiptap with Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
