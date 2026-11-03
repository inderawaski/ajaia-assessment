"use client";

import { useEditorState, type Editor } from "@tiptap/react";

const controls = [
  { label: "Bold", active: (editor: Editor) => editor.isActive("bold"), run: (editor: Editor) => editor.chain().focus().toggleBold().run() },
  { label: "Italic", active: (editor: Editor) => editor.isActive("italic"), run: (editor: Editor) => editor.chain().focus().toggleItalic().run() },
  { label: "Underline", active: (editor: Editor) => editor.isActive("underline"), run: (editor: Editor) => editor.chain().focus().toggleUnderline().run() },
  { label: "Heading", active: (editor: Editor) => editor.isActive("heading", { level: 2 }), run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Bulleted list", active: (editor: Editor) => editor.isActive("bulletList"), run: (editor: Editor) => editor.chain().focus().toggleBulletList().run() },
  { label: "Numbered list", active: (editor: Editor) => editor.isActive("orderedList"), run: (editor: Editor) => editor.chain().focus().toggleOrderedList().run() },
];

export function DocumentFormatting({ editor }: { editor: Editor | null }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => editor ? controls.map((control) => control.active(editor)) : null,
  });

  return (
    <div role="group" aria-label="Document formatting" className="flex flex-wrap gap-2">
      {controls.map((control, index) => (
        <button
          key={control.label}
          disabled={!editor}
          aria-pressed={active?.[index] ?? false}
          className="aria-pressed:bg-foreground aria-pressed:text-background"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { if (editor) control.run(editor); }}
        >
          {control.label}
        </button>
      ))}
    </div>
  );
}
