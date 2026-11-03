import { getSchema } from "@tiptap/core";
import { auth } from "@/backend/auth";
import { documentExtensions, isDocumentId } from "@/shared/documents/content";
import { readDocument, saveDocumentBody } from "@/backend/documents/store";

const schema = getSchema(documentExtensions);

function missingDocument() {
  return Response.json({ error: "Document unavailable." }, { status: 404 });
}

export async function GET(request: Request, { params }: RouteContext<"/api/documents/[id]">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to open this document." }, { status: 401 });

  const { id } = await params;
  if (!isDocumentId(id)) return missingDocument();
  const document = await readDocument(session.user.id, id);
  if (!document) return missingDocument();
  return Response.json(document, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/documents/[id]">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to save this document." }, { status: 401 });

  const { id } = await params;
  if (!isDocumentId(id)) return missingDocument();

  const payload = await request.json().catch(() => null);
  const revision = payload?.revision;
  if (!Number.isInteger(revision) || revision < 0 || revision >= 2147483647) {
    return Response.json({ error: "Invalid document revision." }, { status: 400 });
  }

  let body;
  try {
    const node = schema.nodeFromJSON(payload.body);
    if (node.type !== schema.topNodeType) throw new Error("Expected a document node");
    node.check();
    body = node.toJSON();
  } catch {
    return Response.json({ error: "Invalid document content." }, { status: 400 });
  }

  const saved = await saveDocumentBody(session.user.id, id, body, revision);
  if (saved) return Response.json(saved);

  const document = await readDocument(session.user.id, id);
  if (!document) return missingDocument();
  return Response.json({ error: "A newer version was saved. Copy your edits before reloading." }, { status: 409 });
}
