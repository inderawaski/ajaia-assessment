"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { documentExtensions } from "@/shared/documents/content";
import { DocumentFormatting } from "./document-formatting";

const SAVE_DELAY_MS = 600;
const ACCESS_LOST = "You no longer have access to this document. Your draft is still here.";

type SaveFailure = "retry" | "conflict" | "access" | "session";

export function DocumentEditor({ id, body, revision }: { id: string; body: JSONContent; revision: number }) {
  const router = useRouter();
  const savedRevision = useRef(revision);
  const pending = useRef<JSONContent | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const failure = useRef<SaveFailure | null>(null);
  const leaving = useRef(false);
  const [status, setStatus] = useState("Saved");
  const [recovery, setRecovery] = useState<SaveFailure | null>(null);
  const [reloading, setReloading] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const editor = useEditor({
    extensions: documentExtensions,
    content: body,
    immediatelyRender: false,
    editorProps: { attributes: { role: "textbox", "aria-label": "Document body", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => {
      pending.current = editor.getJSON();
      if (failure.current || inFlight.current) return;

      setStatus("Waiting to save…");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    function warnIfUnsaved(event: BeforeUnloadEvent) {
      if (!pending.current) return;
      event.preventDefault();
      event.returnValue = true;
    }
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("beforeunload", warnIfUnsaved);
    };
  }, []);

  function stopSaving(status: number) {
    const reason = status === 409 ? "conflict" : status === 404 ? "access" : "session";
    failure.current = reason;
    setRecovery(reason);
    setStatus({
      conflict: "A newer version was saved. Your draft is still here.",
      access: ACCESS_LOST,
      session: "Your session ended. Copy your draft before signing in again.",
    }[reason]);
  }

  async function drain() {
    setRecovery(null);
    setStatus("Saving…");

    try {
      while (pending.current) {
        const snapshot = pending.current;
        const response = await fetch(`/api/documents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: snapshot, revision: savedRevision.current }),
        });

        if ([401, 404, 409].includes(response.status)) {
          stopSaving(response.status);
          return false;
        }
        if (!response.ok) throw new Error("Save failed");

        savedRevision.current = (await response.json()).revision;
        if (pending.current === snapshot) pending.current = null;
      }

      setStatus("Saved");
      return true;
    } catch {
      failure.current = "retry";
      setStatus("Could not save. Your edits are still here.");
      setRecovery("retry");
      return false;
    }
  }

  function flush() {
    clearTimeout(timer.current);
    if (inFlight.current) return inFlight.current;
    if (failure.current) return Promise.resolve(false);
    if (!pending.current) return Promise.resolve(true);

    inFlight.current = drain().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }

  function retry() {
    failure.current = null;
    void flush();
  }

  async function copyDraft() {
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(editor.getText());
      setCopyStatus("Draft copied.");
    } catch {
      setCopyStatus("Could not copy automatically. Select and copy the text in the editor.");
    }
  }

  async function reloadLatest() {
    if (!editor || reloading || failure.current !== "conflict") return;
    if (!window.confirm("Discard your unsaved edits and reload the latest saved version?")) return;

    const draft = pending.current;
    setReloading(true);
    setStatus("Loading latest version…");
    try {
      const response = await fetch(`/api/documents/${id}`, { cache: "no-store" });
      if (response.status === 401 || response.status === 404) {
        stopSaving(response.status);
        return;
      }
      if (!response.ok) throw new Error("Reload failed");
      const latest = await response.json();

      if (pending.current !== draft) {
        setStatus("Your draft changed during reload. Reload again to discard those edits.");
        return;
      }

      editor.commands.setContent(latest.body, { emitUpdate: false, errorOnInvalidContent: true });
      savedRevision.current = latest.revision;
      pending.current = null;
      failure.current = null;
      setRecovery(null);
      setCopyStatus("");
      setStatus("Saved");
    } catch {
      setStatus("Could not reload the latest version. Your draft is still here.");
    } finally {
      setReloading(false);
    }
  }

  async function backToDocuments(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (leaving.current) return;
    leaving.current = true;

    // Check again after awaiting the queue in case an edit landed before navigation.
    do {
      if (!(await flush())) {
        leaving.current = false;
        return;
      }
    } while (pending.current);

    router.push("/dashboard");
  }

  return (
    <>
      <DocumentFormatting editor={editor} />
      <div className="document-body"><EditorContent editor={editor} /></div>
      <div className="flex flex-wrap items-center gap-3">
        <span role="status">{status}</span>
        {recovery === "retry" && <button type="button" onClick={retry}>Retry</button>}
        {recovery && recovery !== "retry" && (
          <button type="button" onClick={copyDraft}>Copy unsaved text</button>
        )}
        {recovery === "conflict" && (
          <button type="button" onClick={reloadLatest} disabled={reloading}>Reload latest</button>
        )}
      </div>
      {copyStatus && <p role="status">{copyStatus}</p>}
      <a href="/dashboard" onClick={backToDocuments}>Back to documents</a>
    </>
  );
}
