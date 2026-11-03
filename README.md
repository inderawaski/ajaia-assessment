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

## Import a document

From the dashboard, choose **Import file** and select one UTF-8 `.txt` or `.md` file up to **1 MB (1,000,000 bytes inclusive)**. The editor opens a new private document titled from the filename. Text imports preserve paragraph breaks. Markdown imports preserve headings, bold, italic, and ordered and unordered lists. Embedded HTML appears as literal text.

To verify both formats, import a text file with multiple paragraphs and a Markdown file with a heading, emphasis, lists, and HTML. Edit each document, wait for **Saved**, and reopen it from **Owned** to check that the edit and formatting persist.

Run `node --experimental-strip-types --test tests/document-import.test.mjs` with Node.js 22 or later to check import validation and Tiptap conversion without a database. The integration suite below also exercises importing, editing, and reopening both formats.

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

## Seed the reviewer demo

With Node.js 22.9 or later, initialize the database and start the app before seeding. Set `DATABASE_URL` and `BETTER_AUTH_URL` for the same environment. Set `DEMO_OWNER_PASSWORD` and `DEMO_RECIPIENT_PASSWORD` to dedicated demo passwords of at least 12 characters, then run:

```sh
npm run seed:demo
```

The command reads `.env` and `.env.local`. Exported variables take precedence. For a hosted demo, use the deployed app origin and its matching database. The command prints both document URLs.

| Account | Email | Password |
| --- | --- | --- |
| Reviewer A | `reviewer-a@example.com` | `DEMO_OWNER_PASSWORD` |
| Reviewer B | `reviewer-b@example.com` | `DEMO_RECIPIENT_PASSWORD` |

Share the configured demo passwords with reviewers. Reruns require the original passwords, preserve existing document titles, bodies, and revisions, and restore B's grant on the shared fixture if it was revoked. Any grants added during a walkthrough stay in place, so revoke B's access to the private fixture at the end of the walkthrough.

## Two-session walkthrough

1. Sign in as A and B in separate browser profiles or use a regular window and a private window.
2. Open **Reviewer walkthrough** from A's **Owned** list and B's **Shared with me** list. Edit as B, wait for **Saved**, then reload as A and check the change.
3. As A, create a document, rename it, and apply a heading, bold text, and a list. Wait for **Saved**, return to the dashboard, and reopen it.
4. As B, confirm **Private reviewer notes** is absent from the dashboard and that its direct URL is denied. As A, grant B access by email. Refresh B's dashboard and open the document from **Shared with me**.
5. Leave B's editor open and revoke B's access as A. Edit as B and check that the save is rejected and **Copy unsaved text** is available. Reopen the URL as B and confirm access is denied.
6. Import one TXT and one Markdown file. Check the initial titles, edit both, and reopen them after saving.

Autosave sends one body revision at a time. A stale save preserves the draft and offers copying the unsaved text or reloading the latest version. A revoked grant stops autosave and leaves the draft available to copy. The assessment prioritizes persistence and access checks within the timebox. Collaboration uses saved revisions and reloads.

Hosted reviewer verification is pending. Configure the Vercel origin and dedicated demo credentials before handing off the hosted walkthrough.
