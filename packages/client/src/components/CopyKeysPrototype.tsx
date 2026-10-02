// PROTOTYPE — throwaway UI variants for the translation-key overview (feedback on #8).
// Question: how should an expanded issue show many (long) keys with an at-a-glance,
// colour-coded status for reference copy + supported locales, with details on demand?
// Three variants on /copy-progress, switchable via ?variant=A|B|C|current.
// Lives on branch prototype/copy-key-overview only. Do not merge to main as-is.
//
// Colour assumptions being tested:
//   green  = value present
//   amber  = value present but empty string
//   red    = translation (or reference copy) missing
//   red striped = key itself not found in the translations repo
//   violet dot  = locale has environment overrides
// da-DK, nl-NL, uk-UA are unsupported: hidden from the overview, shown muted in
// details only when a value happens to exist.
import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { TranslationKeyRow } from "../api/client";

export const COPY_KEYS_VARIANTS = [
  { key: "A", name: "Matrix" },
  { key: "B", name: "Accordion chips" },
  { key: "C", name: "Coverage + drawer" },
  { key: "current", name: "Current (#8)" },
];

const UNSUPPORTED_LOCALES = new Set(["da-DK", "nl-NL", "uk-UA"]);

type LocaleEntry = TranslationKeyRow["locales"][number];
type ReferenceCopy = TranslationKeyRow["referenceCopies"][number];
type CellState = "ok" | "empty" | "missing" | "no-key";

const SEVERITY: Record<CellState, number> = { ok: 0, empty: 1, missing: 2, "no-key": 3 };

function localeState(row: TranslationKeyRow, entry: LocaleEntry): CellState {
  if (row.matchState === "unmatched") return "no-key";
  if (entry.state === "missing") return "missing";
  return entry.value.trim() === "" ? "empty" : "ok";
}

function refState(copy: ReferenceCopy): CellState {
  return copy.value.trim() === "" ? "missing" : "ok";
}

function supported(row: TranslationKeyRow) {
  return row.locales.filter((entry) => !UNSUPPORTED_LOCALES.has(entry.locale));
}

function rowHealth(row: TranslationKeyRow): CellState {
  if (row.matchState === "unmatched") return "no-key";
  const states = [
    ...row.referenceCopies.map(refState),
    ...supported(row).map((entry) => localeState(row, entry)),
  ];
  return states.reduce<CellState>((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst), "ok");
}

function issueStats(rows: TranslationKeyRow[]) {
  let keysNotInRepo = 0;
  let missingTranslations = 0;
  let emptyTranslations = 0;
  let missingReference = 0;
  let ok = 0;
  for (const row of rows) {
    row.referenceCopies.forEach((copy) => (refState(copy) === "missing" ? missingReference++ : null));
    if (row.matchState === "unmatched") {
      keysNotInRepo++;
      continue;
    }
    for (const entry of supported(row)) {
      const s = localeState(row, entry);
      if (s === "missing") missingTranslations++;
      else if (s === "empty") emptyTranslations++;
      else ok++;
    }
  }
  return { keysNotInRepo, missingTranslations, emptyTranslations, missingReference, ok };
}

function localeLabel(locale: string, all: string[]) {
  const lang = locale.split("-")[0];
  return all.filter((l) => l.split("-")[0] === lang).length > 1 ? locale : lang;
}

const CELL_BG: Record<CellState, string> = {
  ok: "bg-emerald-500",
  empty: "bg-amber-400",
  missing: "bg-red-500",
  "no-key": "bg-red-100 ring-1 ring-inset ring-red-500",
};

const STRIPES: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(45deg, transparent 0 3px, rgb(239 68 68) 3px 5px)",
};

const STATE_TEXT: Record<CellState, string> = {
  ok: "Present",
  empty: "Empty string",
  missing: "Missing",
  "no-key": "Key not in translations repo",
};

function StatusCell({
  state,
  hasOverrides = false,
  title,
  className = "h-3.5 w-3.5 rounded-sm",
}: {
  state: CellState;
  hasOverrides?: boolean;
  title: string;
  className?: string;
}) {
  return (
    <span
      title={`${title}: ${STATE_TEXT[state]}${hasOverrides ? " · has overrides" : ""}`}
      className={`relative inline-block ${CELL_BG[state]} ${className}`}
      style={state === "no-key" ? STRIPES : undefined}
    >
      {hasOverrides && (
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-violet-600 ring-1 ring-white" />
      )}
    </span>
  );
}

function Legend() {
  const items: Array<[CellState, string]> = [
    ["ok", "Present"],
    ["empty", "Empty"],
    ["missing", "Missing translation / ref"],
    ["no-key", "Key not in repo"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
      {items.map(([state, label]) => (
        <span key={state} className="flex items-center gap-1.5">
          <StatusCell state={state} title={label} />
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-violet-600" /> Overrides
      </span>
    </div>
  );
}

function KeyName({ value, className = "" }: { value: string; className?: string }) {
  const parts = value.split(".");
  const tailCount = parts.length > 2 ? 2 : parts.length;
  const prefix = parts.slice(0, parts.length - tailCount).join(".");
  const tail = parts.slice(parts.length - tailCount).join(".");
  return (
    <span title={value} className={`flex min-w-0 font-mono text-sm ${className}`}>
      {prefix && <span className="min-w-0 truncate text-gray-400">{prefix}.</span>}
      <span className="shrink-0 font-semibold text-gray-900">{tail}</span>
    </span>
  );
}

function ValueText({ entry, row }: { entry: LocaleEntry; row: TranslationKeyRow }) {
  const state = localeState(row, entry);
  if (state === "no-key") return <span className="text-red-600">—</span>;
  if (entry.state === "missing") return <span className="font-medium text-red-600">Missing translation</span>;
  if (entry.value === "") return <span className="italic text-amber-700">(empty string)</span>;
  return <span className="whitespace-pre-wrap text-gray-800">{entry.value}</span>;
}

function KeyDetail({ row }: { row: TranslationKeyRow }) {
  const unsupportedFound = row.locales.filter(
    (entry) => UNSUPPORTED_LOCALES.has(entry.locale) && entry.state === "found",
  );
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="break-all font-mono text-xs text-gray-500">{row.key}</p>
        {row.comment && <p className="mt-1 whitespace-pre-wrap text-gray-600">💬 {row.comment}</p>}
      </div>
      {row.matchState === "unmatched" && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 font-medium text-red-700">
          Key not found in the translations repository. Check the spelling in Jira or add the key.
        </p>
      )}
      <table className="w-full text-left">
        <tbody className="divide-y divide-gray-100">
          {row.referenceCopies.map((copy, index) => (
            <tr key={`ref-${index}`} className="bg-sky-50/50 align-top">
              <td className="w-6 py-2 pl-2"><StatusCell state={refState(copy)} title={copy.header} /></td>
              <td className="w-40 py-2 pr-3 text-xs font-semibold text-sky-800">Ref · {copy.header}</td>
              <td className="py-2 pr-2">
                {copy.value ? (
                  <span className="whitespace-pre-wrap text-gray-800">{copy.value}</span>
                ) : (
                  <span className="font-medium text-red-600">Missing reference copy</span>
                )}
              </td>
            </tr>
          ))}
          {supported(row).map((entry) => (
            <tr key={entry.locale} className="align-top">
              <td className="w-6 py-2 pl-2">
                <StatusCell state={localeState(row, entry)} hasOverrides={entry.overrides.length > 0} title={entry.locale} />
              </td>
              <td className="w-40 py-2 pr-3 font-mono text-xs text-gray-600">{entry.locale}</td>
              <td className="py-2 pr-2">
                <ValueText entry={entry} row={row} />
                {entry.overrides.length > 0 && (
                  <ul className="mt-1.5 space-y-1 border-l-2 border-violet-300 pl-2">
                    {entry.overrides.map((override) => (
                      <li key={override.environment} className="text-xs text-gray-700">
                        <span className="mr-1 rounded bg-violet-100 px-1.5 py-0.5 font-medium text-violet-800">
                          {override.environment}
                        </span>
                        {override.value === "" ? <em className="text-amber-700">(empty)</em> : override.value}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {unsupportedFound.length > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Unsupported locales with values ({unsupportedFound.length})</summary>
          <ul className="mt-1 space-y-1 pl-4">
            {unsupportedFound.map((entry) => (
              <li key={entry.locale}>
                <span className="font-mono">{entry.locale}</span>: {entry.state === "found" ? entry.value || "(empty)" : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function StatsLine({ rows }: { rows: TranslationKeyRow[] }) {
  const s = issueStats(rows);
  return (
    <p className="text-sm text-gray-700">
      <span className="font-semibold">{rows.length} keys</span>
      {s.keysNotInRepo > 0 && <span className="ml-3 font-medium text-red-700">{s.keysNotInRepo} not in repo</span>}
      {s.missingTranslations > 0 && <span className="ml-3 font-medium text-red-600">{s.missingTranslations} missing translations</span>}
      {s.missingReference > 0 && <span className="ml-3 font-medium text-red-600">{s.missingReference} missing ref copy</span>}
      {s.emptyTranslations > 0 && <span className="ml-3 text-amber-700">{s.emptyTranslations} empty</span>}
      {s.keysNotInRepo + s.missingTranslations + s.missingReference + s.emptyTranslations === 0 && (
        <span className="ml-3 font-medium text-emerald-700">All complete</span>
      )}
    </p>
  );
}

// ─── Variant A: Matrix ──────────────────────────────────────────────────────
// Keys down, ref + locales across, one coloured square per cell. Row expands inline.
function VariantA({ rows }: { rows: TranslationKeyRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [problemsOnly, setProblemsOnly] = useState(false);
  const locales = rows[0] ? supported(rows[0]).map((entry) => entry.locale) : [];
  const refHeaders = rows[0]?.referenceCopies.map((copy) => copy.header) ?? [];
  const visible = problemsOnly ? rows.filter((row) => rowHealth(row) !== "ok") : rows;
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatsLine rows={rows} />
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={problemsOnly} onChange={(e) => setProblemsOnly(e.target.checked)} />
          Problems only
        </label>
      </div>
      <Legend />
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-6 px-2 py-2" />
              <th className="px-2 py-2">Key</th>
              {refHeaders.map((header, index) => (
                <th key={`h-${index}`} title={header} className="max-w-[4rem] truncate px-1.5 py-2 text-center text-sky-700">
                  Ref{refHeaders.length > 1 ? ` ${index + 1}` : ""}
                </th>
              ))}
              {locales.map((locale) => (
                <th key={locale} className="px-1.5 py-2 text-center font-mono normal-case">{locale}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((row) => {
              const open = expanded.has(row.key);
              const health = rowHealth(row);
              return (
                <Fragment key={row.key}>
                  <tr
                    onClick={() => toggle(row.key)}
                    className={`cursor-pointer hover:bg-gray-50 ${health === "no-key" ? "bg-red-50/60" : ""}`}
                  >
                    <td className="px-2 py-1.5 text-xs text-gray-400">{open ? "▾" : "▸"}</td>
                    <td className="max-w-[22rem] px-2 py-1.5"><KeyName value={row.key} /></td>
                    {row.referenceCopies.map((copy, index) => (
                      <td key={`r-${index}`} className="px-1.5 py-1.5 text-center">
                        <StatusCell state={refState(copy)} title={copy.header} />
                      </td>
                    ))}
                    {supported(row).map((entry) => (
                      <td key={entry.locale} className="px-1.5 py-1.5 text-center">
                        <StatusCell state={localeState(row, entry)} hasOverrides={entry.overrides.length > 0} title={entry.locale} />
                      </td>
                    ))}
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={2 + refHeaders.length + locales.length} className="bg-gray-50 px-8 py-3">
                        <KeyDetail row={row} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Variant B: Accordion with labelled chips ───────────────────────────────
// One line per key with a severity stripe; status shown as labelled language chips.
function VariantB({ rows }: { rows: TranslationKeyRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const allLocales = rows[0] ? supported(rows[0]).map((entry) => entry.locale) : [];
  const s = issueStats(rows);
  const total = s.ok + s.emptyTranslations + s.missingTranslations + s.keysNotInRepo * allLocales.length || 1;
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const STRIPE: Record<CellState, string> = {
    ok: "border-l-emerald-500",
    empty: "border-l-amber-400",
    missing: "border-l-red-500",
    "no-key": "border-l-red-700",
  };
  const CHIP: Record<CellState, string> = {
    ok: "bg-emerald-100 text-emerald-800",
    empty: "bg-amber-100 text-amber-800",
    missing: "bg-red-500 text-white",
    "no-key": "bg-red-500 text-white",
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="bg-emerald-500" style={{ width: `${(s.ok / total) * 100}%` }} />
          <div className="bg-amber-400" style={{ width: `${(s.emptyTranslations / total) * 100}%` }} />
          <div className="bg-red-500" style={{ width: `${(s.missingTranslations / total) * 100}%` }} />
          <div className="bg-red-800" style={{ width: `${((s.keysNotInRepo * allLocales.length) / total) * 100}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatsLine rows={rows} />
          <button
            type="button"
            onClick={() => setExpanded(new Set(rows.filter((row) => rowHealth(row) !== "ok").map((row) => row.key)))}
            className="text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            Expand all with problems
          </button>
        </div>
      </div>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200 bg-white">
        {rows.map((row) => {
          const open = expanded.has(row.key);
          const health = rowHealth(row);
          return (
            <li key={row.key} className={`border-l-4 ${STRIPE[health]}`}>
              <button
                type="button"
                onClick={() => toggle(row.key)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
              >
                <span className="text-xs text-gray-400">{open ? "▾" : "▸"}</span>
                <KeyName value={row.key} className="flex-1" />
                {health === "no-key" ? (
                  <span className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                    Key not in repo
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1">
                    {row.referenceCopies.map((copy, index) => (
                      <span
                        key={`r-${index}`}
                        title={`${copy.header}: ${STATE_TEXT[refState(copy)]}`}
                        className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          refState(copy) === "ok" ? "bg-sky-100 text-sky-800" : CHIP.missing
                        }`}
                      >
                        REF
                      </span>
                    ))}
                    <span className="mx-1 h-4 w-px bg-gray-200" />
                    {supported(row).map((entry) => {
                      const state = localeState(row, entry);
                      return (
                        <span
                          key={entry.locale}
                          title={`${entry.locale}: ${STATE_TEXT[state]}`}
                          className={`relative rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${CHIP[state]}`}
                        >
                          {localeLabel(entry.locale, allLocales)}
                          {entry.overrides.length > 0 && (
                            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-violet-600 ring-1 ring-white" />
                          )}
                        </span>
                      );
                    })}
                  </span>
                )}
              </button>
              {open && (
                <div className="border-t border-gray-100 bg-gray-50 px-10 py-3">
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

// ─── Variant C: Locale coverage + key tiles + side drawer ───────────────────
// Locale-first: coverage bars on top (click to filter), keys as tiles, detail in a drawer.
function VariantC({ rows }: { rows: TranslationKeyRow[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const locales = rows[0] ? supported(rows[0]).map((entry) => entry.locale) : [];

  const coverage = useMemo(() => {
    const refOk = rows.filter((row) => row.referenceCopies.every((copy) => refState(copy) === "ok")).length;
    return [
      { id: "__ref", label: "Reference copy", ok: refOk, total: rows.length },
      ...locales.map((locale) => ({
        id: locale,
        label: locale,
        ok: rows.filter((row) => {
          const entry = row.locales.find((e) => e.locale === locale);
          return entry ? localeState(row, entry) === "ok" : false;
        }).length,
        total: rows.length,
      })),
    ];
  }, [rows, locales]);
  const notInRepo = rows.filter((row) => row.matchState === "unmatched").length;

  const visible = rows.filter((row) => {
    if (!filter) return true;
    if (filter === "__nokey") return row.matchState === "unmatched";
    if (filter === "__ref") return row.referenceCopies.some((copy) => refState(copy) !== "ok");
    const entry = row.locales.find((e) => e.locale === filter);
    return entry ? localeState(row, entry) !== "ok" : true;
  });
  const openIndex = visible.findIndex((row) => row.key === openKey);
  const openRow = openIndex >= 0 ? visible[openIndex] : rows.find((row) => row.key === openKey);

  useEffect(() => {
    if (!openKey) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenKey(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openKey]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {coverage.map((c) => {
          const pct = c.total ? (c.ok / c.total) * 100 : 0;
          const complete = c.ok === c.total;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(filter === c.id ? null : c.id)}
              className={`rounded-md border bg-white p-2 text-left ${
                filter === c.id ? "border-blue-500 ring-2 ring-blue-200" : complete ? "border-gray-200" : "border-red-300"
              }`}
            >
              <div className="flex items-baseline justify-between text-xs">
                <span className={`font-mono font-semibold ${c.id === "__ref" ? "font-sans text-sky-800" : "text-gray-800"}`}>{c.label}</span>
                <span className={complete ? "text-emerald-700" : "font-semibold text-red-600"}>
                  {c.ok}/{c.total}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-red-200">
                <div className={complete ? "h-full bg-emerald-500" : "h-full bg-emerald-500"} style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
        {notInRepo > 0 && (
          <button
            type="button"
            onClick={() => setFilter(filter === "__nokey" ? null : "__nokey")}
            className={`rounded-md border p-2 text-left text-xs ${
              filter === "__nokey" ? "border-red-700 ring-2 ring-red-200" : "border-red-400"
            } bg-red-50`}
            style={STRIPES}
          >
            <span className="rounded bg-white/90 px-1 font-semibold text-red-800">{notInRepo} key(s) not in repo</span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Legend />
        {filter && (
          <button type="button" onClick={() => setFilter(null)} className="text-xs text-blue-700">
            Clear filter ({visible.length} shown)
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((row) => {
          const health = rowHealth(row);
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => setOpenKey(row.key)}
              className={`rounded-md border bg-white p-2 text-left hover:shadow ${
                openKey === row.key ? "border-blue-500" : health === "no-key" ? "border-red-500 bg-red-50" : "border-gray-200"
              }`}
            >
              <KeyName value={row.key} />
              <div className="mt-2 flex gap-0.5">
                {row.referenceCopies.map((copy, index) => (
                  <StatusCell key={`r-${index}`} state={refState(copy)} title={`Ref · ${copy.header}`} className="h-2 flex-1 rounded-sm" />
                ))}
                <span className="w-1" />
                {supported(row).map((entry) => (
                  <StatusCell
                    key={entry.locale}
                    state={localeState(row, entry)}
                    hasOverrides={entry.overrides.length > 0}
                    title={entry.locale}
                    className="h-2 flex-1 rounded-sm"
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
      {openRow && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setOpenKey(null)} />
          <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col bg-white shadow-2xl">
            <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <KeyName value={openRow.key} className="flex-1" />
              <button
                type="button"
                disabled={openIndex <= 0}
                onClick={() => setOpenKey(visible[openIndex - 1].key)}
                className="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={openIndex < 0 || openIndex >= visible.length - 1}
                onClick={() => setOpenKey(visible[openIndex + 1].key)}
                className="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:opacity-30"
              >
                ↓
              </button>
              <button type="button" onClick={() => setOpenKey(null)} className="rounded px-2 py-1 text-sm hover:bg-gray-100">
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-auto p-4">
              <KeyDetail row={openRow} />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default function CopyKeysPrototype({ variant, rows }: { variant: string; rows: TranslationKeyRow[] }) {
  if (variant === "B") return <VariantB rows={rows} />;
  if (variant === "C") return <VariantC rows={rows} />;
  return <VariantA rows={rows} />;
}
