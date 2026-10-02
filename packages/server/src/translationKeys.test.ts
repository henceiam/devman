import { describe, expect, it } from "vitest";
import {
  parseTranslationKeysTable,
  type AdfNode,
} from "./services/missions.js";

const text = (value: string): AdfNode => ({ type: "text", text: value });
const cell = (value: string, type = "tableCell"): AdfNode => ({
  type,
  content: [{ type: "paragraph", content: [text(value)] }],
});
const table = (...rows: AdfNode[]): AdfNode => ({
  type: "table",
  content: rows,
});
const row = (...cells: AdfNode[]): AdfNode => ({
  type: "tableRow",
  content: cells,
});
const document = (...content: AdfNode[]) => ({
  type: "doc",
  version: 1 as const,
  content,
});

describe("parseTranslationKeysTable", () => {
  it("preserves exact keys, separate reference-copy columns, and comments", () => {
    const result = parseTranslationKeysTable(document(
      table(
        row(
          cell("Key", "tableHeader"),
          cell("Copy", "tableHeader"),
          cell("Copy - clinical", "tableHeader"),
          cell("Comment", "tableHeader"),
        ),
        row(
          cell("checkout.title"),
          cell("Continue"),
          cell("Continue to checkout"),
          cell("Shown on the payment step"),
        ),
      ),
    ));

    expect(result).toEqual({
      state: "ready",
      rows: [{
        key: "checkout.title",
        referenceCopies: [
          { header: "Copy", value: "Continue" },
          { header: "Copy - clinical", value: "Continue to checkout" },
        ],
        comment: "Shown on the payment step",
      }],
    });
  });

  it("returns empty for an absent or empty Jira table", () => {
    expect(parseTranslationKeysTable(null)).toEqual({ state: "empty" });
    expect(parseTranslationKeysTable(document(table()))).toEqual({ state: "empty" });
  });

  it("returns unstructured content when no usable Key table exists", () => {
    const content = document(table(
      row(cell("Identifier", "tableHeader"), cell("Copy", "tableHeader")),
      row(cell("checkout.title"), cell("Continue")),
    ));

    expect(parseTranslationKeysTable(content)).toEqual({ state: "unstructured", content });
  });

  it("returns unstructured content when a data row is only partly parseable", () => {
    const content = document(table(
      row(
        cell("Key", "tableHeader"),
        cell("Copy", "tableHeader"),
        cell("Comment", "tableHeader"),
      ),
      row(cell("checkout.title")),
    ));

    expect(parseTranslationKeysTable(content)).toEqual({ state: "unstructured", content });
  });
});
