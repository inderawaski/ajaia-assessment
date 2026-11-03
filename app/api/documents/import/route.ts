import { auth } from "@/backend/auth";
import { importedDocumentBody } from "@/backend/documents/import-content";
import { createImportedDocument } from "@/backend/documents/store";
import { readImportFile } from "@/shared/documents/import-file";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to import a document." }, { status: 401 });

  // Require a non-safelisted header so a cross-origin HTML form cannot submit an import.
  if (request.headers.get("X-Document-Import") !== "1") {
    return Response.json({ error: "Invalid import request." }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const files = form?.getAll("file");
  if (files?.length !== 1 || !(files[0] instanceof File)) {
    return Response.json({ error: "Choose one .txt or .md file." }, { status: 400 });
  }

  let imported;
  try {
    imported = await readImportFile(files[0]);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not read the file." }, { status: 400 });
  }

  const body = importedDocumentBody(imported.text, imported.markdown);
  const document = await createImportedDocument(session.user.id, imported.title, body);
  return Response.json(document, { status: 201 });
}
