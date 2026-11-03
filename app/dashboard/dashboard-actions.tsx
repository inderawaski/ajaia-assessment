"use client";

import { useState } from "react";
import { authClient } from "../account-form";

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
    <div className="flex flex-wrap gap-3">
      <button disabled={pending} onClick={() => run(async () => {
        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error();
        const { id } = await response.json();
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Request fresh session and document state.
        window.location.assign(`/documents/${id}`);
      }, "Could not create a document. Try again.")}>New document</button>
      <button disabled={pending} onClick={() => run(async () => {
        const result = await authClient.signOut();
        if (result.error) throw new Error();
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Request fresh session and document state.
        window.location.assign("/");
      }, "Could not sign out. Try again.")}>Sign out</button>
      {error && <p role="alert" className="w-full">{error}</p>}
    </div>
  );
}
