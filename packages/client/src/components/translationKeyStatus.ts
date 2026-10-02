import type { TranslationKeyRow } from "../api/client";

export type LocaleEntry = TranslationKeyRow["locales"][number];
export type ReferenceCopy = TranslationKeyRow["referenceCopies"][number];

/** Value presence for one reference copy or locale cell, ordered by severity. */
export type CellState = "present" | "empty" | "missing" | "key-not-in-repo";

// Locales present in the translations repo but not currently supported by the product.
export const UNSUPPORTED_LOCALES: ReadonlySet<string> = new Set(["da-DK", "nl-NL", "uk-UA"]);

const SEVERITY: Record<CellState, number> = { present: 0, empty: 1, missing: 2, "key-not-in-repo": 3 };

export function supportedLocales(row: TranslationKeyRow): LocaleEntry[] {
  return row.locales.filter((entry) => !UNSUPPORTED_LOCALES.has(entry.locale));
}

export function unsupportedLocalesWithValues(row: TranslationKeyRow): Array<Extract<LocaleEntry, { state: "found" }>> {
  return row.locales.filter(
    (entry): entry is Extract<LocaleEntry, { state: "found" }> =>
      UNSUPPORTED_LOCALES.has(entry.locale) && entry.state === "found",
  );
}

export function localeState(row: TranslationKeyRow, entry: LocaleEntry): CellState {
  if (row.matchState === "unmatched") return "key-not-in-repo";
  if (entry.state === "missing") return "missing";
  return entry.value.trim() === "" ? "empty" : "present";
}

export function referenceState(copy: ReferenceCopy): CellState {
  return copy.value.trim() === "" ? "missing" : "present";
}

/** Worst state across the key's reference copies and supported locales. */
export function keyState(row: TranslationKeyRow): CellState {
  if (row.matchState === "unmatched") return "key-not-in-repo";
  const states = [
    ...row.referenceCopies.map(referenceState),
    ...supportedLocales(row).map((entry) => localeState(row, entry)),
  ];
  return states.reduce<CellState>(
    (worst, state) => (SEVERITY[state] > SEVERITY[worst] ? state : worst),
    "present",
  );
}

export interface IssueKeySummary {
  keys: number;
  keysNotInRepo: number;
  missingReferenceCopies: number;
  /** Supported-locale cell counts across matched keys. */
  locales: { present: number; empty: number; missing: number };
}

export function summarizeKeys(rows: TranslationKeyRow[]): IssueKeySummary {
  const summary: IssueKeySummary = {
    keys: rows.length,
    keysNotInRepo: 0,
    missingReferenceCopies: 0,
    locales: { present: 0, empty: 0, missing: 0 },
  };
  for (const row of rows) {
    summary.missingReferenceCopies += row.referenceCopies.filter((copy) => referenceState(copy) === "missing").length;
    if (row.matchState === "unmatched") {
      summary.keysNotInRepo++;
      continue;
    }
    for (const entry of supportedLocales(row)) {
      const state = localeState(row, entry);
      if (state === "present" || state === "empty" || state === "missing") summary.locales[state]++;
    }
  }
  return summary;
}

/** Short chip label: language only (`fr`) unless several locales share it (`en-GB`, `en-US`). */
export function localeChipLabel(locale: string, allLocales: string[]): string {
  const language = locale.split("-")[0];
  return allLocales.filter((other) => other.split("-")[0] === language).length > 1 ? locale : language;
}

/** Splits a dotted key so the trailing (most specific) segments can stay visible when truncated. */
export function splitKey(key: string): { prefix: string; tail: string } {
  const parts = key.split(".");
  if (parts.length <= 2) return { prefix: "", tail: key };
  return { prefix: `${parts.slice(0, -2).join(".")}.`, tail: parts.slice(-2).join(".") };
}
