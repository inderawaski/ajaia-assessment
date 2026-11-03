"use client";

import { useState } from "react";

export function DocumentSharing({ id }: { id: string }) {
  const [emails, setEmails] = useState<string[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const endpoint = `/api/documents/${id}/grants`;

  async function load() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error();
      setEmails((await response.json()).emails);
    } catch {
      setError("Could not load sharing access. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function update(method: "POST" | "DELETE", address: string) {
    const normalizedEmail = address.trim().toLowerCase();
    const fallback = method === "POST" ? "Could not grant access. Try again." : "Could not remove access. Try again.";
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        setError(failure?.error ?? fallback);
        return;
      }

      if (method === "POST") {
        setEmails((current) => [...new Set([...(current ?? []), normalizedEmail])].sort());
        setEmail("");
        setMessage(`Editing access granted to ${normalizedEmail}.`);
      } else {
        setEmails((current) => current?.filter((entry) => entry !== normalizedEmail) ?? []);
        setMessage(`Editing access removed for ${normalizedEmail}.`);
      }
    } catch {
      setError(fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded border p-3" onToggle={(event) => {
      if (event.currentTarget.open && !busy) void load();
    }}>
      <summary className="cursor-pointer">Share editing access</summary>
      <div className="mt-3 grid gap-3">
        {error && <p role="alert">{error}</p>}
        <p role="status">{busy ? "Updating sharing access…" : message}</p>
        {emails === null ? (
          !busy && <button type="button" onClick={() => void load()}>Load sharing access</button>
        ) : (
          <>
            <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
              event.preventDefault();
              void update("POST", email);
            }}>
              <label className="grid gap-1">
                Recipient email
                <input type="email" value={email} maxLength={254} required disabled={busy}
                  onChange={(event) => setEmail(event.target.value)} />
              </label>
              <button type="submit" disabled={busy}>Grant access</button>
            </form>
            {emails.length === 0 ? <p>No recipients have editing access.</p> : (
              <ul aria-label="Recipients with editing access" className="grid gap-2">
                {emails.map((address) => (
                  <li key={address} className="flex flex-wrap items-center gap-2">
                    <span className="break-all">{address}</span>
                    <button type="button" disabled={busy} aria-label={`Remove access for ${address}`}
                      onClick={() => void update("DELETE", address)}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </details>
  );
}
