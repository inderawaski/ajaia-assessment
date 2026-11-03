import { auth } from "@/backend/auth";
import { grantDocumentAccess, listDocumentGrants, revokeDocumentAccess } from "@/backend/documents/grants";
import { isDocumentId } from "@/shared/documents/content";

type Context = RouteContext<"/api/documents/[id]/grants">;

function unavailable() {
  return Response.json({ error: "Document unavailable." }, { status: 404 });
}

function signIn() {
  return Response.json({ error: "Sign in to manage sharing." }, { status: 401 });
}

export async function GET(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return signIn();

  const { id } = await params;
  if (!isDocumentId(id)) return unavailable();

  const emails = await listDocumentGrants(session.user.id, id);
  if (!emails) return unavailable();
  return Response.json({ emails }, { headers: { "Cache-Control": "private, no-store" } });
}

async function updateGrant(request: Request, { params }: Context, remove: boolean) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return signIn();

  const { id } = await params;
  if (!isDocumentId(id)) return unavailable();

  const payload = await request.json().catch(() => null);
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (remove) {
    if (!await revokeDocumentAccess(session.user.id, id, email)) return unavailable();
  } else {
    if (email === session.user.email.toLowerCase()) {
      if (!await listDocumentGrants(session.user.id, id)) return unavailable();
      return Response.json({ error: "You already own this document." }, { status: 400 });
    }
    if (!await grantDocumentAccess(session.user.id, id, email)) return unavailable();
  }

  return new Response(null, { status: 204 });
}

export function POST(request: Request, context: Context) {
  return updateGrant(request, context, false);
}

export function DELETE(request: Request, context: Context) {
  return updateGrant(request, context, true);
}
