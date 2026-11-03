"use client";

import { useState, type FormEvent } from "react";
import { readImportFile } from "@/shared/documents/import-file";

export function DocumentImport({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    if (!(file instanceof File) || !file.name) {
      setError("Choose one .txt or .md file.");
      return;
    }

    setPending(true);
    setError("");
    try {
      await readImportFile(file);
      const response = await fetch("/api/documents/import", {
        method: "POST",
        headers: { "X-Document-Import": "1" },
        body: data,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.id) throw new Error(result?.error || "Could not import the file. Try again.");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Request fresh session and document state.
      window.location.assign(`/documents/${result.id}`);
    } catch (error) {
      setError(error instanceof Error && !(error instanceof TypeError || error instanceof SyntaxError)
        ? error.message : "Could not import the file. Try again.");
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" disabled={disabled || pending} aria-expanded={open}
        aria-controls="document-import" onClick={() => { setOpen(!open); setError(""); }}>
        Import file
      </button>
      <form id="document-import" hidden={!open} className="w-full" onSubmit={submit}>
        <fieldset disabled={disabled || pending} className="grid gap-2">
          <label htmlFor="import-file">Choose a file</label>
          <p id="import-file-help">One UTF-8 .txt or .md file, up to 1 MB (1,000,000 bytes).</p>
          <input id="import-file" name="file" type="file" accept=".txt,.md" required
            aria-describedby="import-file-help" onChange={() => setError("")} />
          <button type="submit" className="justify-self-start">{pending ? "Importing…" : "Import document"}</button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>
    </>
  );
}
