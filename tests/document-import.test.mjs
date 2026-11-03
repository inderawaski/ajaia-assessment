import assert from "node:assert/strict";
import { test } from "node:test";
import { getSchema } from "@tiptap/core";
import { importedDocumentBody } from "../backend/documents/import-content.ts";
import { documentExtensions } from "../shared/documents/content.ts";
import { importFileLimit, readImportFile } from "../shared/documents/import-file.ts";

const schema = getSchema(documentExtensions);

test("import validation enforces extension, inclusive byte limit, UTF-8, and nonblank content", async () => {
  assert.equal((await readImportFile(new File(["x".repeat(importFileLimit)], "Boundary.TXT"))).title, "Boundary");
  await assert.rejects(readImportFile(new File(["é".repeat(importFileLimit / 2), "x"], "Large.md")), /1,000,000 bytes/);
  await assert.rejects(readImportFile(new File(["hello"], "wrong.html")), /Choose a .txt or .md/);
  await assert.rejects(readImportFile(new File([Uint8Array.of(255)], "invalid.txt")), /valid UTF-8/);
  await assert.rejects(readImportFile(new File([" \r\n\t"], "blank.md")), /empty or contains only whitespace/);
});

test("text imports preserve paragraph breaks and literal markup", async () => {
  const { text, markdown } = await readImportFile(new File(["First\r\n\r\n<b>Second</b>"], "Notes.txt"));
  const doc = schema.nodeFromJSON(importedDocumentBody(text, markdown));
  doc.check();
  assert.deepEqual(Array.from({ length: doc.childCount }, (_, index) => doc.child(index).textContent),
    ["First", "", "<b>Second</b>"]);
});

test("Markdown imports use editable schema nodes and preserve HTML as text", () => {
  const body = importedDocumentBody(
    "# Heading\n\n**Bold *italic*** and <img src=x onerror=alert(1)>\n\n3. Item\n   - Nested\n\n<script>alert(1)</script>",
    true,
  );
  const doc = schema.nodeFromJSON(body);
  doc.check();
  assert.equal(doc.child(0).type.name, "heading");
  assert.deepEqual(doc.child(1).child(1).marks.map(({ type }) => type.name), ["bold", "italic"]);
  assert.match(doc.child(1).textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(doc.child(2).type.name, "orderedList");
  assert.equal(doc.child(2).attrs.start, 3);
  assert.equal(doc.child(2).firstChild.lastChild.type.name, "bulletList");
  assert.equal(doc.child(3).textContent, "<script>alert(1)</script>");
});
