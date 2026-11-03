import StarterKit from "@tiptap/starter-kit";

export const documentExtensions = [StarterKit.configure({
  link: false,
})];

export function isDocumentId(id: string) {
  return /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id);
}
