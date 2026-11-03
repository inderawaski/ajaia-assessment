"use client";

import { Button } from "@heroui/react";
import { DocumentIcon } from "./document-icon";

import { useEditorState, type Editor } from "@tiptap/react";

const controls = [
  { label: "Bold", icon: "bold", active: (editor: Editor) => editor.isActive("bold"), run: (editor: Editor) => editor.chain().focus().toggleBold().run() },
  { label: "Italic", icon: "italic", active: (editor: Editor) => editor.isActive("italic"), run: (editor: Editor) => editor.chain().focus().toggleItalic().run() },
  { label: "Underline", icon: "underline", active: (editor: Editor) => editor.isActive("underline"), run: (editor: Editor) => editor.chain().focus().toggleUnderline().run() },
  { label: "Heading", icon: "heading", active: (editor: Editor) => editor.isActive("heading", { level: 2 }), run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Bulleted list", icon: "bullets", active: (editor: Editor) => editor.isActive("bulletList"), run: (editor: Editor) => editor.chain().focus().toggleBulletList().run() },
  { label: "Numbered list", icon: "numbered", active: (editor: Editor) => editor.isActive("orderedList"), run: (editor: Editor) => editor.chain().focus().toggleOrderedList().run() },
] as const;

export function DocumentFormatting({ editor }: { editor: Editor | null }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => editor ? controls.map((control) => control.active(editor)) : null,
  });

  return (
    <div role="group" aria-label="Document formatting" className="flex flex-wrap gap-2">
      {controls.map((control, index) => (
        <Button
          key={control.label}
          isIconOnly
          aria-label={control.label}
          size="sm"
          variant="secondary"
          isDisabled={!editor}
          aria-pressed={active?.[index] ?? false}
          className="aria-pressed:bg-foreground aria-pressed:text-background"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { if (editor) control.run(editor); }}
        >
          <DocumentIcon name={control.icon} />
        </Button>
      ))}
    </div>
  );
}
