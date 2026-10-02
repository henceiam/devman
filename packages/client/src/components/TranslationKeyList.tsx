import { useState } from "react";
import type { TranslationKeyRow } from "../api/client";
import {
  keyState,
  localeChipLabel,
  localeState,
  referenceState,
  splitKey,
  summarizeKeys,
  supportedLocales,
  unsupportedLocalesWithValues,
  type CellState,
} from "./translationKeyStatus";

const STATE_LABEL: Record<CellState, string> = {
  present: "Present",
  empty: "Empty string",
  missing: "Missing",
  "key-not-in-repo": "Key not in translations repository",
};

const ROW_STRIPE: Record<CellState, string> = {
  present: "border-l-emerald-500",
  empty: "border-l-amber-400",
  missing: "border-l-red-500",
  "key-not-in-repo": "border-l-red-700",
};

const CHIP: Record<CellState, string> = {
  present: "bg-emerald-100 text-emerald-800",
  empty: "bg-amber-100 text-amber-800",
  missing: "bg-red-500 text-white",
  "key-not-in-repo": "bg-red-500 text-white",
};

const DOT: Record<CellState, string> = {
  present: "bg-emerald-500",
  empty: "bg-amber-400",
  missing: "bg-red-500",
  "key-not-in-repo": "bg-red-700",
};

export default function TranslationKeyList({ issueKey, rows }: { issueKey: string; rows: TranslationKeyRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const localeNames = rows[0] ? supportedLocales(rows[0]).map((entry) => entry.locale) : [];
  const problemKeys = rows.filter((row) => keyState(row) !== "present").map((row) => row.key);

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-3">
      <SummaryBar rows={rows} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend />
        <div className="flex gap-3 text-xs font-medium">
          {problemKeys.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(new Set(problemKeys))}
              className="text-blue-700 hover:text-blue-900"
            >
              Expand keys with problems
            </button>
          )}
          {expanded.size > 0 && (
            <button type="button" onClick={() => setExpanded(new Set())} className="text-gray-600 hover:text-gray-900">
              Collapse all
            </button>
          )}
        </div>
      </div>
      <ul
        aria-label={`Translation keys for ${issueKey}`}
        className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200 bg-white"
      >
        {rows.map((row) => {
          const isOpen = expanded.has(row.key);
          const state = keyState(row);
          return (
            <li key={row.key} className={`border-l-4 ${ROW_STRIPE[state]}`}>
              <div className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(row.key)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span aria-hidden="true" className="text-xs text-gray-400">{isOpen ? "▾" : "▸"}</span>
                  <KeyName value={row.key} />
                </button>
                <StatusChips row={row} localeNames={localeNames} onClick={() => toggle(row.key)} />
              </div>
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-10">
                  <KeyDetail row={row} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function KeyName({ value }: { value: string }) {
  const { prefix, tail } = splitKey(value);
  return (
    <span title={value} className="flex min-w-0 font-mono text-sm">
      {prefix && <span className="min-w-0 truncate text-gray-400">{prefix}</span>}
      <span className="shrink-0 font-semibold text-gray-900">{tail}</span>
    </span>
  );
}

function StatusChips({
  row,
  localeNames,
  onClick,
}: {
  row: TranslationKeyRow;
  localeNames: string[];
  onClick: () => void;
}) {
  if (row.matchState === "unmatched") {
    return (
      <span className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
        Key not in repo
      </span>
    );
  }

  return (
    <span className="flex shrink-0 cursor-pointer items-center gap-1" onClick={onClick}>
      {row.referenceCopies.map((copy, index) => {
        const state = referenceState(copy);
        const label = `Reference copy ${copy.header}: ${STATE_LABEL[state]}`;
        return (
          <span
            key={`${copy.header}-${index}`}
            role="img"
            aria-label={label}
            title={label}
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
              state === "present" ? "bg-sky-100 text-sky-800" : CHIP.missing
            }`}
          >
            REF
          </span>
        );
      })}
      <span aria-hidden="true" className="mx-1 h-4 w-px bg-gray-200" />
      {supportedLocales(row).map((entry) => {
        const state = localeState(row, entry);
        const label = `${entry.locale}: ${STATE_LABEL[state]}${
          entry.overrides.length > 0 ? `, ${entry.overrides.length} override(s)` : ""
        }`;
        return (
          <span
            key={entry.locale}
            role="img"
            aria-label={label}
            title={label}
            className={`relative rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${CHIP[state]}`}
          >
            {localeChipLabel(entry.locale, localeNames)}
            {entry.overrides.length > 0 && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-violet-600 ring-1 ring-white" />
            )}
          </span>
        );
      })}
    </span>
  );
}

function SummaryBar({ rows }: { rows: TranslationKeyRow[] }) {
  const summary = summarizeKeys(rows);
  const { present, empty, missing } = summary.locales;
  const total = present + empty + missing;
  const hasProblems = summary.keysNotInRepo + summary.missingReferenceCopies + missing + empty > 0;
  const width = (count: number) => `${total ? (count / total) * 100 : 0}%`;

  return (
    <div className="space-y-1.5">
      {total > 0 && (
        <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="bg-emerald-500" style={{ width: width(present) }} />
          <div className="bg-amber-400" style={{ width: width(empty) }} />
          <div className="bg-red-500" style={{ width: width(missing) }} />
        </div>
      )}
      <p className="flex flex-wrap gap-x-3 text-sm text-gray-700">
        <span className="font-semibold">{summary.keys} {summary.keys === 1 ? "key" : "keys"}</span>
        {summary.keysNotInRepo > 0 && (
          <span className="font-medium text-red-700">{summary.keysNotInRepo} not in translations repo</span>
        )}
        {missing > 0 && <span className="font-medium text-red-600">{missing} missing translations</span>}
        {summary.missingReferenceCopies > 0 && (
          <span className="font-medium text-red-600">{summary.missingReferenceCopies} missing reference copy</span>
        )}
        {empty > 0 && <span className="text-amber-700">{empty} empty</span>}
        {!hasProblems && <span className="font-medium text-emerald-700">No missing values</span>}
      </p>
    </div>
  );
}

function Legend() {
  const items: Array<[CellState, string]> = [
    ["present", "Present"],
    ["empty", "Empty"],
    ["missing", "Missing"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
      {items.map(([state, label]) => (
        <span key={state} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${DOT[state]}`} />
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-violet-600" />
        Has overrides
      </span>
    </div>
  );
}

function KeyDetail({ row }: { row: TranslationKeyRow }) {
  const unsupported = unsupportedLocalesWithValues(row);
  return (
    <section aria-label={`Details for ${row.key}`} className="space-y-3 text-sm">
      <div>
        <p className="break-all font-mono text-xs text-gray-500">{row.key}</p>
        {row.comment && <p className="mt-1 whitespace-pre-wrap text-gray-600">{row.comment}</p>}
      </div>
      {row.matchState === "unmatched" && (
        <p role="status" className="rounded border border-red-300 bg-red-50 px-3 py-2 font-medium text-red-700">
          No exact key match in the translations repository.
        </p>
      )}
      <table className="w-full text-left">
        <tbody className="divide-y divide-gray-100">
          {row.referenceCopies.map((copy, index) => {
            const state = referenceState(copy);
            return (
              <tr key={`${copy.header}-${index}`} className="bg-sky-50/60 align-top">
                <td className="w-5 py-2 pl-2"><StateDot state={state} /></td>
                <th scope="row" className="w-44 py-2 pr-3 text-xs font-semibold text-sky-800">{copy.header}</th>
                <td className="py-2 pr-2">
                  {state === "present" ? (
                    <span className="whitespace-pre-wrap text-gray-800">{copy.value}</span>
                  ) : (
                    <span className="font-medium text-red-600">Missing reference copy</span>
                  )}
                </td>
              </tr>
            );
          })}
          {supportedLocales(row).map((entry) => (
            <tr key={entry.locale} className="align-top">
              <td className="w-5 py-2 pl-2"><StateDot state={localeState(row, entry)} /></td>
              <th scope="row" className="w-44 py-2 pr-3 font-mono text-xs font-normal text-gray-600">{entry.locale}</th>
              <td className="py-2 pr-2">
                <LocaleValue row={row} entry={entry} />
                <OverrideList overrides={entry.overrides} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {unsupported.length > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Unsupported locales with values ({unsupported.length})</summary>
          <ul className="mt-2 space-y-1 pl-4">
            {unsupported.map((entry) => (
              <li key={entry.locale}>
                <span className="font-mono">{entry.locale}</span>: {entry.value === "" ? "(empty string)" : entry.value}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function StateDot({ state }: { state: CellState }) {
  return <span title={STATE_LABEL[state]} className={`mt-1 inline-block h-2.5 w-2.5 rounded-sm ${DOT[state]}`} />;
}

function LocaleValue({ row, entry }: { row: TranslationKeyRow; entry: TranslationKeyRow["locales"][number] }) {
  if (row.matchState === "unmatched") return <span className="text-red-600">—</span>;
  if (entry.state === "missing") return <span className="font-medium text-red-600">Missing translation</span>;
  if (entry.value === "") return <span className="italic text-amber-700">(empty string)</span>;
  return <span className="whitespace-pre-wrap text-gray-800">{entry.value}</span>;
}

function OverrideList({ overrides }: { overrides: TranslationKeyRow["locales"][number]["overrides"] }) {
  if (overrides.length === 0) return null;
  return (
    <ul aria-label="Environment overrides" className="mt-1.5 space-y-1 border-l-2 border-violet-300 pl-2">
      {overrides.map((override) => (
        <li key={override.environment} className="text-xs text-gray-700">
          <span className="mr-1.5 rounded bg-violet-100 px-1.5 py-0.5 font-medium text-violet-800">
            {override.environment}
          </span>
          {override.value === "" ? <em className="text-amber-700">(empty string)</em> : override.value}
        </li>
      ))}
    </ul>
  );
}
