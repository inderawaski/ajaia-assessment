import { Suspense } from "react";
import { listOwnedDocuments, listSharedDocuments } from "@/backend/documents/store";
import { requireSession } from "@/backend/session";
import { DashboardActions } from "@/frontend/documents/dashboard-actions";

export default function Dashboard() {
  return <Suspense fallback={<p className="p-6">Loading…</p>}><Content /></Suspense>;
}

async function Content() {
  const { user } = await requireSession();
  const [documents, shared] = await Promise.all([
    listOwnedDocuments(user.id).catch(() => null),
    listSharedDocuments(user.email).catch(() => null),
  ]);

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-5 p-6">
      <h1>Documents</h1>
      <DashboardActions />
      <section aria-labelledby="owned-heading" className="grid gap-3">
        <h2 id="owned-heading">Owned</h2>
        {documents === null ? (
          <p role="alert">Could not load documents. <a href="/dashboard">Retry</a></p>
        ) : documents.length === 0 ? (
          <p>You haven’t created any documents yet.</p>
        ) : (
          <ul className="grid gap-2">
            {documents.map(({ id, title }) => <li key={id}><a href={`/documents/${id}`}>{title}</a></li>)}
          </ul>
        )}
      </section>
      <section aria-labelledby="shared-heading" className="grid gap-3">
        <h2 id="shared-heading">Shared with me</h2>
        {shared === null ? (
          <p role="alert">Could not load shared documents. <a href="/dashboard">Retry</a></p>
        ) : shared.length === 0 ? (
          <p>No documents have been shared with you yet.</p>
        ) : (
          <ul className="grid gap-2">
            {shared.map(({ id, title }) => <li key={id}><a href={`/documents/${id}`}>{title}</a></li>)}
          </ul>
        )}
      </section>
    </main>
  );
}
