"use client";

import { Button, Modal } from "@heroui/react";

import { useState, type FormEvent } from "react";
import { readImportFile } from "@/shared/documents/import-file";

export function DocumentImport({ disabled }: { disabled: boolean }) {
  const [hasFile, setHasFile] = useState(false);
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
    <Modal onOpenChange={(open) => { if (open) { setError(""); setHasFile(false); } }}>
      <Button type="button" isDisabled={disabled || pending}>Import file</Button>
      <Modal.Backdrop isDismissable={!pending} isKeyboardDismissDisabled={pending}>
        <Modal.Container placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger isDisabled={pending} />
            <Modal.Header><Modal.Heading>Import file</Modal.Heading></Modal.Header>
            <Modal.Body>
              <form className="grid gap-2" onSubmit={submit}>
                <fieldset disabled={disabled || pending} className="import-file-picker grid gap-2">
                                  <p id="import-file-help">Only .txt and .md files are supported, 1 MB max.</p>
                  <input id="import-file" name="file" type="file" accept=".txt,.md" required
                    aria-label="File to import" aria-describedby="import-file-help" onChange={(event) => {
                      setHasFile(Boolean(event.currentTarget.files?.length));
                      setError("");
                    }} />
                  <Button variant="primary" type="submit" isDisabled={!hasFile || pending} className="justify-self-start">{pending ? "Importing…" : "Import document"}</Button>
                </fieldset>
                {error && <p role="alert">{error}</p>}
              </form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
