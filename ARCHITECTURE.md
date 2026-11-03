# Architecture and tradeoffs

### Priorities 
I focused on making the core flow work end to end. Users can create, edit, reopen, and share documents.

### Stack
Next.js serves the workspace and document APIs. React and Tiptap handle editing and formatting. Better Auth provides email and password sessions, and Neon Postgres stores documents and grants.

### Access
The server checks access on document reads and writes. Owners control titles and grants. Recipients can read and edit the body while a grant matches their signed-in account’s normalized email. Owners can grant access before the recipient signs up.

### Email ownership
Email verification is disabled for the demo. Someone who registers a recipient’s address first can claim its grant.

### Persistence
Postgres stores Tiptap JSON and a numeric revision. Each body save checks current access and the expected revision in the same update. The editor sends one save at a time and keeps the draft in memory if a save fails. After a conflict or revocation, the user can copy unsaved text. Collaborators see saved changes when they reload or reopen the document.

### Import
A single UTF-8 TXT or Markdown file up to 1 MB becomes a private editable document. Both the client and server validate the file. Embedded HTML is treated as text, and imports use the same Tiptap format as edits.

### Scope and follow-up
I deferred live co-editing, comments, and version history. With another two to four hours, I would prioritize verifying recipient email ownership before allowing accounts to redeem email grants.
