"use client";

import { Button } from "@heroui/react";

import { DocumentImport } from "./document-import";
import { useState } from "react";
import { authClient } from "@/frontend/accounts/account-form";

export function DashboardActions() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>, message: string) {
    setPending(true);
    setError("");
    try {
      await action();
    } catch {
      setError(message);
      setPending(false);
    }
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1>Documents</h1>
        <Button variant="tertiary" size="sm" isDisabled={pending} onClick={() => run(async () => {
          const result = await authClient.signOut();
          if (result.error) throw new Error();
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Request fresh session and document state.
          window.location.assign("/");
        }, "Could not sign out. Try again.")}>Sign out</Button>
      </header>
      <div className="flex flex-wrap gap-3">
        <Button isDisabled={pending} onClick={() => run(async () => {
          const response = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!response.ok) throw new Error();
          const { id } = await response.json();
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Request fresh session and document state.
          window.location.assign(`/documents/${id}`);
        }, "Could not create a document. Try again.")}>New document</Button>
        <DocumentImport disabled={pending} />
        {error && <p role="alert" className="w-full">{error}</p>}
      </div>
    </>
  );
}
