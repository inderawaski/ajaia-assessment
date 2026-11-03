import { auth } from "@/backend/auth";
import { createDocument } from "@/backend/documents/store";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to create a document." }, { status: 401 });
  if (request.headers.get("content-type") !== "application/json") {
    return Response.json({ error: "Expected a JSON request." }, { status: 415 });
  }

  const document = await createDocument(session.user.id);
  return Response.json(document, { status: 201 });
}
