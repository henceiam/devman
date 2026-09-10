import { describe, expect, it } from "vitest";
import { hasMeaningfulAdfContent, type AdfNode } from "./services/missions.js";

const paragraph = (...content: AdfNode[]): AdfNode => ({ type: "paragraph", content });
const text = (value: string): AdfNode => ({ type: "text", text: value });

describe("hasMeaningfulAdfContent", () => {
  it("treats an empty content array as contentless", () => {
    expect(hasMeaningfulAdfContent([])).toBe(false);
  });

  it("treats a doc with only empty paragraphs as contentless", () => {
    expect(
      hasMeaningfulAdfContent([
        paragraph(),
        paragraph(),
        paragraph({ type: "text", text: "" }),
      ]),
    ).toBe(false);
  });

  it("treats paragraphs with text as meaningful", () => {
    expect(hasMeaningfulAdfContent([paragraph(text("Hello"))])).toBe(true);
  });

  it("treats a doc with only an inlineCard as meaningful (initialized)", () => {
    expect(
      hasMeaningfulAdfContent([
        { type: "inlineCard", attrs: { url: "https://example.com" } },
      ]),
    ).toBe(true);
  });

  it("treats a doc with only a mention inside a paragraph as meaningful", () => {
    expect(
      hasMeaningfulAdfContent([
        paragraph({ type: "mention", attrs: { id: "user-1" } }),
      ]),
    ).toBe(true);
  });

  it("treats an all-blank table as meaningful (initialized)", () => {
    const blankCell: AdfNode = { type: "tableCell", content: [paragraph()] };
    expect(
      hasMeaningfulAdfContent([
        { type: "table", content: [{ type: "tableRow", content: [blankCell, blankCell] }] },
      ]),
    ).toBe(true);
  });

  it("treats any other node type as meaningful, even with no text or attrs", () => {
    for (const type of ["mediaSingle", "rule", "hardBreak", "heading", "codeBlock", "embedCard"]) {
      expect(hasMeaningfulAdfContent([{ type }])).toBe(true);
    }
  });
});
