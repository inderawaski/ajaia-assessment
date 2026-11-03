import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto my-auto w-full max-w-md p-6">
      <div className="workspace-panel space-y-3">
        <h1 className="text-2xl font-semibold">Page unavailable</h1>
        <p>This page may not exist, or you may not have permission to view it.</p>
        <Link href="/" className="button button--primary no-underline!">
          Go to home
        </Link>
      </div>
    </main>
  );
}
