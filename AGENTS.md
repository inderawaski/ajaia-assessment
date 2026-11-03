# Project Agent Instructions

## Project Context
- Product: Ajaia Assessment collaborative document editor
- Users: Ordinary accounts sharing documents by explicit grant
- Stack: Next.js, TypeScript, npm, Neon Postgres, Better Auth, Tiptap, Vercel
- Important commands: install: npm install; lint: npm run lint; typecheck: npx tsc --noEmit; build: npm run build

## Engineering Priorities
- Correct behavior, simplicity, maintainability, and clear boundaries.
- Follow existing patterns unless they cause a concrete problem.
- Organize primarily by business domain, with responsibility separation within each domain.
- Avoid speculative abstractions and unrelated refactoring.
- See `.agents/references/architecture-principles.md` and the installed `project-structure` skill.

## Request Modes
- **Discussion:** Answer and inspect as needed; do not edit code unless asked.
- **Implement issue:** Read the issue and linked context; inspect the repository; implement the agreed behavior; verify.
- **Direct change:** Proceed on small, clear tasks. Ask focused questions or suggest specification discovery if behavior or scope is materially unclear.

## Decision Boundaries
- Make routine technical choices autonomously.
- Ask before consequential changes to user-visible behavior, data, security, APIs, architecture, or scope.
- If the approved spec conflicts with the codebase or constraints, surface the conflict; don't silently rewrite requirements.
- Do not perform destructive actions, deploy, publish, or change external tickets without explicit authorization.

## Quality and Completion
- Use available skills for architecture, debugging, testing, verification, and review when the task calls for them; availability does not mean every skill must be invoked on every change.
- For failures, use systematic debugging to find the cause before changing code. Choose tests by observable behavior and risk; test-first work is useful when it clarifies behavior or guards a regression, but is not mandatory.
- Run relevant tests, lint, type checks, and build commands where available; do not claim unrun checks passed.
- Use the code-review skill when a review is requested or a change is consequential, broad, or security-sensitive. Tiny changes need a proportionate self-check, not a separate review stage or reviewer agent.
- Report changed behavior, checks run, limitations, and unresolved issues.

## Frontend Skill Selection
- Honor an explicitly requested skill.
- Default to `frontend-ui-engineering` for existing interfaces, feature additions, accessibility, state, responsive fixes, and implementation within an established design system.
- Prefer `frontend-app-builder` when establishing a new visual direction or undertaking a substantial redesign. Follow its concept-generation and visual-verification workflow.
- When both apply, let `frontend-app-builder` guide visual direction and fidelity; use `frontend-ui-engineering` for complementary engineering and accessibility guidance. Resolve conflicts using user requirements, repository conventions, and the accepted design; surface unresolved conflicts rather than silently changing requirements.
- Before selecting `frontend-app-builder`, check its Image Gen and browser-tool requirements. If unavailable, explain the limitation and use `frontend-ui-engineering` for supported work; do not claim the concept/fidelity workflow was completed.

## Assessment scope

- Follow current official documentation for stack setup and integration. Keep credentials and auth secrets in environment variables.
- Aim for two hours and stop at four. Deploy a working signup and persistence slice early when authorized. Prioritize required flows and verification ahead of visual polish.
- Use ordinary Better Auth accounts with email/password and verification disabled. Enforce authentication and document access on every server read and write, including direct URLs. Owners manage titles and grants. Explicitly granted recipients can read and edit the body. Owners grant and revoke access by recipient email, including before signup. Match grants to the signed-in account’s normalized email and keep one grant per document and recipient email.
- Store Tiptap JSON and a numeric body revision in Postgres. Check current access and the expected revision atomically on saves. Keep rename separate. Serialize client saves, preserve pending edits, and retain drafts on transient failure, conflict, or revoked access.
- Import one UTF-8 TXT or Markdown file up to 1,000,000 bytes. Validate on both sides and treat embedded HTML as text. Use the same Tiptap format for edits and imports.
- Verify access with owner, recipient, and unrelated accounts before grant, after grant, and after revocation. Before submission, run the hosted two-session walkthrough and document setup, seed, test commands, demo access, and remaining gaps.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
