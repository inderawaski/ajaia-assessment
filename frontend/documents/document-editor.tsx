"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { documentExtensions } from "@/shared/documents/content";
import { DocumentFormatting } from "./document-formatting";

const SAVE_DELAY_MS = 600;

export function DocumentEditor({ id, body, revision }: { id: string; body: JSONContent; revision: number }) {
  const router = useRouter();
  const savedRevision = useRef(revision);
  const pending = useRef<JSONContent | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const failure = useRef<"retry" | "blocked" | null>(null);
  const leaving = useRef(false);
  const [status, setStatus] = useState("Saved");
  const [canRetry, setCanRetry] = useState(false);

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

  async function drain() {
    setCanRetry(false);
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
          failure.current = "blocked";
          const { error } = await response.json().catch(() => ({}));
          setStatus(error ?? "This draft could not be saved. Copy your edits before leaving.");
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
      setCanRetry(true);
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
        {canRetry && <button type="button" onClick={retry}>Retry</button>}
      </div>
      <a href="/dashboard" onClick={backToDocuments}>Back to documents</a>
    </>
  );
}
