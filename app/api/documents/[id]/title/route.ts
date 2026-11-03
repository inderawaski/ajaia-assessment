import { auth } from "@/backend/auth";
import { renameOwnedDocument } from "@/backend/documents/store";
import { isDocumentId } from "@/shared/documents/content";

export async function PATCH(request: Request, { params }: RouteContext<"/api/documents/[id]/title">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in again to rename this document." }, { status: 401 });

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  if (!title || title.includes("\0")) {
    return Response.json({ error: "Enter a valid document title." }, { status: 400 });
  }

  const renamed = isDocumentId(id) && await renameOwnedDocument(session.user.id, id, title);
  if (!renamed) {
    return Response.json({ error: "Only the document owner can rename it." }, { status: 404 });
  }
  return Response.json(renamed);
}
