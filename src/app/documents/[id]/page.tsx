import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isDocumentId } from "@/shared/documents/content";
import { readDocument } from "@/backend/documents/store";
import { requireSession } from "@/backend/session";
import { DocumentEditor } from "@/frontend/documents/document-editor";

export default function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  return <Suspense fallback={<p className="p-6">Loading…</p>}><Content params={params} /></Suspense>;
}

async function Content({ params }: Pick<PageProps<"/documents/[id]">, "params">) {
  const { user } = await requireSession();
  const { id } = await params;
  if (!isDocumentId(id)) notFound();

  const document = await readDocument(user.id, id);
  if (!document) notFound();

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 p-6">
      <h1>{document.title}</h1>
      <DocumentEditor key={id} id={id} body={document.body} revision={document.revision} />
    </main>
  );
}
