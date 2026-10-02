import { describe, expect, it } from "vitest";
import type { TranslationKeyRow } from "../api/client";
import {
  keyState,
  localeChipLabel,
  localeState,
  splitKey,
  summarizeKeys,
  supportedLocales,
  unsupportedLocalesWithValues,
} from "./translationKeyStatus";

function row(overrides: Partial<TranslationKeyRow> = {}): TranslationKeyRow {
  return {
    key: "checkout.payment.title",
    referenceCopies: [{ header: "Copy", value: "Continue" }],
    comment: "",
    matchState: "matched",
    locales: [
      { locale: "en-GB", state: "found", value: "Continue", overrides: [] },
      { locale: "fr-FR", state: "found", value: "Continuer", overrides: [] },
    ],
    ...overrides,
  };
}

describe("translationKeyStatus", () => {
  it("classifies present, empty, missing and unmatched locale values", () => {
    const matched = row({
      locales: [
        { locale: "en-GB", state: "found", value: "Hi", overrides: [] },
        { locale: "fr-FR", state: "found", value: "  ", overrides: [] },
        { locale: "sv-SE", state: "missing", overrides: [] },
      ],
    });
    expect(matched.locales.map((entry) => localeState(matched, entry))).toEqual(["present", "empty", "missing"]);

    const unmatched = row({ matchState: "unmatched" });
    expect(localeState(unmatched, unmatched.locales[0])).toBe("key-not-in-repo");
  });

  it("reports the worst state across reference copies and supported locales", () => {
    expect(keyState(row())).toBe("present");
    expect(keyState(row({ referenceCopies: [{ header: "Copy", value: "" }] }))).toBe("missing");
    expect(keyState(row({
      locales: [{ locale: "en-GB", state: "found", value: "", overrides: [] }],
    }))).toBe("empty");
    expect(keyState(row({ matchState: "unmatched" }))).toBe("key-not-in-repo");
  });

  it("ignores unsupported locales for status but surfaces them when they have values", () => {
    const withUnsupported = row({
      locales: [
        { locale: "en-GB", state: "found", value: "Continue", overrides: [] },
        { locale: "da-DK", state: "missing", overrides: [] },
        { locale: "nl-NL", state: "found", value: "Doorgaan", overrides: [] },
        { locale: "uk-UA", state: "missing", overrides: [] },
      ],
    });
    expect(supportedLocales(withUnsupported).map((entry) => entry.locale)).toEqual(["en-GB"]);
    expect(keyState(withUnsupported)).toBe("present");
    expect(unsupportedLocalesWithValues(withUnsupported).map((entry) => entry.locale)).toEqual(["nl-NL"]);
  });

  it("summarizes keys without counting locales of keys missing from the repo", () => {
    const summary = summarizeKeys([
      row(),
      row({
        key: "b",
        referenceCopies: [{ header: "Copy", value: "" }],
        locales: [
          { locale: "en-GB", state: "found", value: "", overrides: [] },
          { locale: "fr-FR", state: "missing", overrides: [] },
          { locale: "da-DK", state: "missing", overrides: [] },
        ],
      }),
      row({ key: "c", matchState: "unmatched" }),
    ]);
    expect(summary).toEqual({
      keys: 3,
      keysNotInRepo: 1,
      missingReferenceCopies: 1,
      locales: { present: 2, empty: 1, missing: 1 },
    });
  });

  it("shortens chip labels only when the language is unambiguous", () => {
    const all = ["en-GB", "en-US", "fr-FR"];
    expect(localeChipLabel("fr-FR", all)).toBe("fr");
    expect(localeChipLabel("en-GB", all)).toBe("en-GB");
  });

  it("keeps the last two key segments as the visible tail", () => {
    expect(splitKey("app.checkout.payment.title")).toEqual({ prefix: "app.checkout.", tail: "payment.title" });
    expect(splitKey("checkout.title")).toEqual({ prefix: "", tail: "checkout.title" });
  });
});
