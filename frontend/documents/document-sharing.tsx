"use client";

import { Button, Modal, Input, Spinner } from "@heroui/react";
import { DocumentIcon } from "./document-icon";

import { useState } from "react";

export function DocumentSharing({ id }: { id: string }) {
  const [emails, setEmails] = useState<string[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
      } else {
        setEmails((current) => current?.filter((entry) => entry !== normalizedEmail) ?? []);
      }
    } catch {
      setError(fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onOpenChange={(open) => { if (open && !busy) void load(); }}>
      <Button type="button" variant="primary" className="justify-self-start">Share document</Button>
      <Modal.Backdrop>
        <Modal.Container placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header><Modal.Heading>Share document</Modal.Heading></Modal.Header>
            <Modal.Body className="grid gap-3">
              {error && <p role="alert">{error}</p>}
              {busy ? (
                <Spinner size="sm" aria-label="Updating sharing access" />
              ) : emails === null ? (
                <Button isIconOnly variant="secondary" aria-label="Load sharing access"
                  onClick={() => void load()}><DocumentIcon name="reload" /></Button>
              ) : emails.length > 0 ? (
                <ul aria-label="Recipients with editing access" className="grid gap-2">
                  {emails.map((address) => (
                    <li key={address} className="flex flex-wrap items-center gap-2">
                      <span className="break-all">{address}</span>
                      <Button isIconOnly variant="danger" size="sm" type="button"
                        aria-label={`Remove access for ${address}`}
                        onClick={() => void update("DELETE", address)}><DocumentIcon name="remove" /></Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
                event.preventDefault();
                if (!busy && emails !== null) void update("POST", email);
              }}>
                <label className="grid gap-1">
                  Recipient email
                  <Input type="email" value={email} maxLength={254} required
                    onChange={(event) => setEmail(event.target.value)} />
                </label>
                <Button type="submit" isDisabled={busy || emails === null}>Grant access</Button>
              </form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
