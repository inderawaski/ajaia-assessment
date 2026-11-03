"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { documentExtensions } from "@/lib/documents/content";

export function DocumentEditor({ id, body, revision }: { id: string; body: JSONContent; revision: number }) {
  const savedRevision = useRef(revision);
  const editCount = useRef(0);
  const savedEditCount = useRef(0);
  const inFlight = useRef(false);
  const [status, setStatus] = useState("Saved");
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const editor = useEditor({
    extensions: documentExtensions,
    content: body,
    immediatelyRender: false,
    editorProps: { attributes: { role: "textbox", "aria-label": "Document body", "aria-multiline": "true" } },
    onUpdate: () => {
      editCount.current += 1;
      if (!inFlight.current && !blocked) setStatus("Unsaved changes");
    },
  });

  useEffect(() => {
    function warnIfUnsaved(event: BeforeUnloadEvent) {
      if (editCount.current === savedEditCount.current) return;
      event.preventDefault();
      event.returnValue = true;
    }
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => window.removeEventListener("beforeunload", warnIfUnsaved);
  }, []);

  async function save() {
    if (!editor || inFlight.current || blocked || editCount.current === savedEditCount.current) return;
    inFlight.current = true;
    setSaving(true);
    setStatus("Saving…");
    const savingEditCount = editCount.current;
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editor.getJSON(), revision: savedRevision.current }),
      });
      if ([401, 404, 409].includes(response.status)) {
        setBlocked(true);
        setStatus((await response.json()).error);
        return;
      }
      if (!response.ok) throw new Error();
      savedRevision.current = (await response.json()).revision;
      savedEditCount.current = savingEditCount;
      setStatus(editCount.current === savingEditCount ? "Saved" : "Unsaved changes");
    } catch {
      setStatus("Could not save. Try saving again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <div className="document-body"><EditorContent editor={editor} /></div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={!editor || saving || blocked || status === "Saved"}>Save document</button>
        <span role="status">{status}</span>
      </div>
      <a href="/dashboard">Back to documents</a>
    </>
  );
}
