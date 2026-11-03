import type { JSONContent } from "@tiptap/core";
import { marked, type Token } from "marked";

function textNode(text: string): JSONContent[] {
  return text ? [{ type: "text", text }] : [];
}

function inline(tokens: Token[], marks: NonNullable<JSONContent["marks"]> = []): JSONContent[] {
  return tokens.flatMap((token) => {
    switch (token.type) {
      case "strong":
      case "em":
        return inline(token.tokens ?? [], [...marks, { type: token.type === "strong" ? "bold" : "italic" }]);
      case "br":
        return [{ type: "hardBreak" }];
      default:
        return textNode(token.type === "text" || token.type === "escape" ? token.text : token.raw)
          .map((node) => marks.length ? { ...node, marks } : node);
    }
  });
}

function blocks(tokens: Token[]): JSONContent[] {
  return tokens.flatMap((token) => {
    switch (token.type) {
      case "space":
        return [];
      case "heading":
        return [{ type: "heading", attrs: { level: token.depth }, content: inline(token.tokens ?? []) }];
      case "paragraph":
      case "text":
        return [{ type: "paragraph", content: token.tokens ? inline(token.tokens) : textNode(token.text) }];
      case "list":
        return [{
          type: token.ordered ? "orderedList" : "bulletList",
          ...(token.ordered && { attrs: { start: token.start } }),
          content: token.items.map((item: { tokens: Token[] }) => {
            const content = blocks(item.tokens);
            if (content[0]?.type !== "paragraph") content.unshift({ type: "paragraph" });
            return { type: "listItem", content };
          }),
        }];
      case "blockquote": {
        const content = blocks(token.tokens ?? []);
        return [{ type: "blockquote", content: content.length ? content : [{ type: "paragraph" }] }];
      }
      default:
        // HTML and unsupported Markdown stay editable as literal text.
        return [{ type: "paragraph", content: textNode(token.raw) }];
    }
  });
}

export function importedDocumentBody(text: string, markdown: boolean): JSONContent {
  const content = markdown
    ? blocks(marked.lexer(text, { gfm: false }))
    : text.split("\n").map((line) => ({ type: "paragraph", content: textNode(line) }));

  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph", content: textNode(text) }],
  };
}
