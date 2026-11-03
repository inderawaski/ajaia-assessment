export const importFileLimit = 1_000_000;

export async function readImportFile(file: File) {
  const extension = /\.(txt|md)$/i.exec(file.name);
  if (!extension) throw new Error("Choose a .txt or .md file.");
  if (file.size > importFileLimit) throw new Error("The file must be 1,000,000 bytes or smaller.");

  const bytes = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("The file must contain valid UTF-8 text.");
  }
  if (!text.trim()) throw new Error("The file is empty or contains only whitespace.");

  return {
    title: file.name.slice(0, extension.index).trim() || "Untitled document",
    markdown: extension[1].toLowerCase() === "md",
    text: text.replaceAll("\0", "\uFFFD").replace(/\r\n?/g, "\n"),
  };
}
