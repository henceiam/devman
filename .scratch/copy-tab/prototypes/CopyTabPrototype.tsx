import { useEffect } from "react";
import { useSearchParams } from "react-router";

// PROTOTYPE: Three Copy-tab presentations, switchable with ?copyPrototype=A|B|C.
type Variant = "A" | "B" | "C";
type PrototypeState = "empty" | "saving" | "initialized" | "conflict" | "error";

const variants: Array<{ key: Variant; name: string }> = [
  { key: "A", name: "Field sections" },
  { key: "B", name: "Status rail" },
  { key: "C", name: "Compact Jira" },
];

const states: Array<{ key: PrototypeState; name: string }> = [
  { key: "empty", name: "Empty" },
  { key: "saving", name: "Saving" },
  { key: "initialized", name: "Populated" },
  { key: "conflict", name: "Conflict" },
  { key: "error", name: "Error" },
];

function TranslationTable({ blank = false }: { blank?: boolean }) {
  const rows = blank
    ? [["", "", ""], ["", "", ""]]
    : [
        ["checkout.delivery.title", "Choose delivery method", "Heading above delivery options"],
        ["checkout.delivery.pickup", "Pick up in store", "Shown when store pickup is available"],
      ];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
          <tr>{["Key", "Copy", "Comment"].map((heading) => <th key={heading} className="border-b border-r border-gray-200 px-3 py-2 last:border-r-0">{heading}</th>)}</tr>
        </thead>
        <tbody className="text-gray-700">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={`h-11 border-r border-gray-200 px-3 py-2 align-top last:border-r-0 ${rowIndex < rows.length - 1 ? "border-b" : ""} ${cellIndex === 0 && cell ? "font-mono text-xs" : ""}`}>
                  {cell || <span className="text-gray-300">&nbsp;</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyAction({ state, compact = false }: { state: PrototypeState; compact?: boolean }) {
  const saving = state === "saving";
  const error = state === "error";
  return (
    <div className={compact ? "space-y-2" : "rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center"}>
      {!compact && <p className="text-sm font-medium text-gray-700">No translation keys yet</p>}
      {!compact && <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">Start with the standard Key, Copy, and Comment table. Existing Jira content will never be replaced by this action.</p>}
      <button disabled={saving} className={`${compact ? "" : "mt-4"} inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:bg-blue-400`}>
        {saving && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {saving ? "Creating table…" : "Create translation table"}
      </button>
      {error && <p role="alert" className={`${compact ? "" : "mx-auto mt-3 max-w-md"} text-xs leading-5 text-red-600`}>Couldn’t create the table. Jira did not save the change. Try again.</p>}
    </div>
  );
}

function ConflictNotice() {
  return (
    <div className="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495a1.75 1.75 0 0 1 3.03 0l6.28 10.86A1.75 1.75 0 0 1 16.28 16H3.72a1.75 1.75 0 0 1-1.515-2.645l6.28-10.86ZM10 6.75a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
      <div><p className="text-xs font-semibold">Translation keys changed in Jira</p><p className="mt-0.5 text-xs leading-5">The latest Jira content is shown below. Nothing was overwritten.</p></div>
    </div>
  );
}

function TranslationContent({ state }: { state: PrototypeState }) {
  if (state === "initialized" || state === "conflict") return <TranslationTable />;
  return <EmptyAction state={state} />;
}

function VariantA({ state }: { state: PrototypeState }) {
  return (
    <div className="space-y-6">
      {state === "conflict" && <ConflictNotice />}
      <section>
        <h3 className="text-sm font-semibold text-gray-800">Copy &amp; Translations</h3>
        <p className="mt-1 text-xs text-gray-500">Current Jira workflow status</p>
        <span className="mt-2 inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800">Copy - ready to start</span>
      </section>
      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Translation keys</h3>
          <p className="mt-1 text-xs text-gray-500">Read-only content from Jira</p>
        </div>
        <TranslationContent state={state} />
      </section>
    </div>
  );
}

function VariantB({ state }: { state: PrototypeState }) {
  return (
    <div>
      {state === "conflict" && <ConflictNotice />}
      <div className="grid min-h-72 gap-5 sm:grid-cols-[180px_1fr]">
        <aside className="rounded-lg bg-slate-900 p-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Copy status</p>
          <p className="mt-3 text-sm font-semibold leading-5">Copy - ready to start</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full w-1/3 rounded-full bg-cyan-400" /></div>
          <p className="mt-2 text-[11px] leading-4 text-slate-400">Managed in Jira</p>
        </aside>
        <section>
          <h3 className="text-base font-semibold text-gray-900">Translation keys</h3>
          <p className="mb-4 mt-1 text-xs text-gray-500">The implementation-ready strings attached to this issue.</p>
          {state === "initialized" || state === "conflict" ? <TranslationTable /> : <EmptyAction state={state} />}
        </section>
      </div>
    </div>
  );
}

function VariantC({ state }: { state: PrototypeState }) {
  const hasTable = state === "initialized" || state === "conflict";
  return (
    <div className="space-y-4">
      {state === "conflict" && <ConflictNotice />}
      <dl className="grid grid-cols-[150px_1fr] items-center border-y border-gray-200 text-sm">
        <dt className="py-3 text-xs font-medium text-gray-500">Copy &amp; Translations</dt>
        <dd className="py-3 text-sm text-gray-800">Copy - ready to start</dd>
      </dl>
      <div className="flex items-end justify-between gap-4">
        <div><h3 className="text-sm font-semibold text-gray-800">Translation keys</h3><p className="mt-1 text-xs text-gray-500">Synced from Jira · read only</p></div>
        {!hasTable && <EmptyAction state={state} compact />}
      </div>
      {hasTable ? <TranslationTable /> : <TranslationTable blank />}
      {!hasTable && <p className="text-[11px] text-gray-400">Preview of the standard table structure</p>}
    </div>
  );
}

export default function CopyTabPrototype() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawVariant = searchParams.get("copyPrototype");
  const variant: Variant = rawVariant === "B" || rawVariant === "C" ? rawVariant : "A";
  const rawState = searchParams.get("copyState");
  const state: PrototypeState = states.some((item) => item.key === rawState) ? rawState as PrototypeState : "empty";

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const cycleVariant = (direction: -1 | 1) => {
    const index = variants.findIndex((item) => item.key === variant);
    updateParam("copyPrototype", variants[(index + direction + variants.length) % variants.length].key);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable]")) return;
      cycleVariant(event.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 p-1.5">
        <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-violet-700">Prototype state</span>
        {states.map((item) => <button key={item.key} onClick={() => updateParam("copyState", item.key)} className={`rounded-md px-2 py-1 text-[11px] font-medium ${state === item.key ? "bg-white text-violet-800 shadow-sm" : "text-violet-600 hover:bg-white/60"}`}>{item.name}</button>)}
      </div>
      {variant === "A" && <VariantA state={state} />}
      {variant === "B" && <VariantB state={state} />}
      {variant === "C" && <VariantC state={state} />}
      <div className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full bg-gray-950 px-2 py-2 text-white shadow-xl">
        <button aria-label="Previous Copy prototype" onClick={() => cycleVariant(-1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/15">←</button>
        <span className="min-w-36 text-center text-xs font-medium">{variant} · {variants.find((item) => item.key === variant)?.name}</span>
        <button aria-label="Next Copy prototype" onClick={() => cycleVariant(1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/15">→</button>
      </div>
    </>
  );
}
