"use client";

import { Button, Input } from "@heroui/react";
import { DocumentIcon } from "./document-icon";

import { useEffect, useRef, useState } from "react";

export function DocumentTitle({ id, initialTitle, canRename }: {
  id: string;
  initialTitle: string;
  canRename: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const renameButton = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const restoreFocus = useRef(false);
  const editing = draft !== null;

  useEffect(() => {
    if (editing) input.current?.select();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      renameButton.current?.focus();
    }
  }, [editing]);

  function close(focusButton: boolean) {
    restoreFocus.current = focusButton;
    setDraft(null);
    setError("");
  }

  async function save(focusButton: boolean) {
    if (draft === null || inFlight.current) return;
    const nextTitle = draft.trim();
    if (!nextTitle) {
      setError("Enter a document title, then press Enter or leave the field to retry.");
      return;
    }
    if (nextTitle === title) {
      close(focusButton);
      return;
    }

    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${id}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        setError(failure?.error ?? "Could not rename. Press Enter or leave the field to retry.");
        return;
      }
      setTitle((await response.json()).title);
      close(focusButton && document.activeElement === input.current);
    } catch {
      setError("Could not rename. Press Enter or leave the field to retry.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  if (!canRename) return <h1 className="break-words">{title}</h1>;

  return editing ? (
    <div className="grid min-w-0 gap-2">
      <Input
        ref={input}
        aria-label="Document title"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "document-title-error" : undefined}
        value={draft}
        readOnly={saving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void save(false)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") {
            event.preventDefault();
            void save(true);
          }
          if (event.key === "Escape" && !inFlight.current) close(true);
        }}
      />
      {saving && <span role="status">Renaming…</span>}
      {error && <p id="document-title-error" role="alert">{error}</p>}
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <h1 className="min-w-0 [overflow-wrap:anywhere]">{title}</h1>
      <Button isIconOnly variant="secondary" size="sm" className="shrink-0" ref={renameButton}
        aria-label="Rename document" onClick={() => setDraft(title)}>
        <DocumentIcon name="rename" />
      </Button>
    </div>
  );
}
