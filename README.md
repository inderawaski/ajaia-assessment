# Ajaia Assessment

The first slice supports email/password signup and signin, an owned document list, and private Tiptap editing with manual saves.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env`. Set `DATABASE_URL` to the pooled Postgres connection string from the Neon **Connect** dialog. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Set `BETTER_AUTH_URL` to the app origin.
3. Initialize the Better Auth tables with `npx auth@latest migrate --config lib/auth.ts`.
4. Apply `db/documents.sql` to the same database using the Neon SQL Editor or `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/documents.sql` after exporting `DATABASE_URL` in your shell.
5. Run `npm run dev` and open http://localhost:3000.

Run `npm run lint`, `npx next typegen && npx tsc --noEmit`, and `npm run build` to check the project. If a restricted local environment prevents the Turbopack CSS worker from binding to a port, `npm run build -- --webpack` can verify compilation and serve the app for functional checks.

## Vercel setup

Import or link this project in Vercel as a Next.js app. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` for the target environment. Use the stable deployment origin for `BETTER_AUTH_URL`. Run both initialization steps above against the target Neon database before testing the deployment.

## Verify the private flow

On the target URL, sign up, create an **Untitled document**, enter text, and select **Save document**. Wait for **Saved**, then refresh and reopen from **Owned**. Confirm the title and text persist. Copy the document URL and open it from a separate browser session signed in as another account. Confirm the other account cannot find or open the document.

Run `TEST_APP_URL=http://localhost:3000 node --test tests/private-documents.test.mjs` against a running app with a dedicated test database. The smoke test creates two accounts and one document. It checks signup, signin, list isolation, direct URL and API access, persistence, and concurrent writes with the same revision.

The server derives ownership from the Better Auth session. Postgres stores the body as Tiptap JSON and checks the owner and expected revision in the same update that advances the revision. Failed saves preserve the in-memory draft. The editor warns before leaving with unsaved edits where the browser supports it.

## Setup references

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Neon with Next.js](https://neon.com/docs/guides/nextjs)
- [Better Auth Next.js integration](https://www.better-auth.com/docs/integrations/next)
- [Tiptap with Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
