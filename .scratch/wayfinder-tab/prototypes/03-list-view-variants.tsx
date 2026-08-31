// PROTOTYPE — throwaway UI exploration for .scratch/wayfinder-tab/issues/03-prototype-list-view.md
// Three variants of the list/card fallback view for the Wayfinder tab, switchable via ?wf=A|B|C.
// Uses synthetic mock data. Not wired to real Jira. Not meant to survive past the prototype decision.
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, FlaskConical, MessageSquare, ListChecks, Flag, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft } from "lucide-react";
import { statusBadge } from "./statusUtils";
import JiraLink from "./JiraLink";

type WfType = "research" | "prototype" | "grilling" | "task";
type WfStatusCategory = "new" | "indeterminate" | "done";

interface WfTicket {
  key: string;
  summary: string;
  type: WfType;
  status: string;
  statusCategory: WfStatusCategory;
  assignee: string | null;
  blockedBy: string[];
  blocks: string[];
}

// Synthetic data: a 3-deep chain (WF-1 -> WF-2 -> WF-3/WF-4 -> WF-6), one claimed-and-blocked-open
// ticket (WF-3), two frontier tickets (WF-4, WF-5), and a closed/rejected pair for status variety.
const MOCK_TICKETS: WfTicket[] = [
  { key: "WF-1", summary: "Define API contract", type: "grilling", status: "Closed", statusCategory: "done", assignee: "Henric Johansson", blockedBy: [], blocks: ["WF-2"] },
  { key: "WF-2", summary: "Research bulk-fetch feasibility", type: "research", status: "Closed", statusCategory: "done", assignee: "Henric Johansson", blockedBy: ["WF-1"], blocks: ["WF-3", "WF-4"] },
  { key: "WF-3", summary: "Prototype list view", type: "prototype", status: "In Progress", statusCategory: "indeterminate", assignee: "Henric Johansson", blockedBy: ["WF-2"], blocks: ["WF-6"] },
  { key: "WF-4", summary: "Prototype graph view", type: "prototype", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-2"], blocks: ["WF-6"] },
  { key: "WF-5", summary: "Apply example labels in real Jira", type: "task", status: "To do", statusCategory: "new", assignee: null, blockedBy: [], blocks: [] },
  { key: "WF-6", summary: "Finalize implementation spec", type: "grilling", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-3", "WF-4"], blocks: [] },
  { key: "WF-7", summary: "Old spike: graph libraries", type: "research", status: "Rejected", statusCategory: "done", assignee: "Henric Johansson", blockedBy: [], blocks: [] },
];

const TYPE_META: Record<WfType, { label: string; icon: React.ReactNode; color: string }> = {
  research: { label: "Research", icon: <Search className="h-3 w-3" />, color: "bg-sky-100 text-sky-700" },
  prototype: { label: "Prototype", icon: <FlaskConical className="h-3 w-3" />, color: "bg-violet-100 text-violet-700" },
  grilling: { label: "Grilling", icon: <MessageSquare className="h-3 w-3" />, color: "bg-amber-100 text-amber-700" },
  task: { label: "Task", icon: <ListChecks className="h-3 w-3" />, color: "bg-gray-200 text-gray-700" },
};

function byKey(key: string): WfTicket | undefined {
  return MOCK_TICKETS.find((t) => t.key === key);
}

function isUnblocked(t: WfTicket): boolean {
  return t.blockedBy.every((k) => byKey(k)?.statusCategory === "done");
}

function isClaimed(t: WfTicket): boolean {
  return t.assignee !== null && t.statusCategory !== "done";
}

function isFrontier(t: WfTicket): boolean {
  return t.statusCategory !== "done" && t.assignee === null && isUnblocked(t);
}

function TypeBadge({ type }: { type: WfType }) {
  const meta = TYPE_META[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function Avatar({ name }: { name: string | null }) {
  if (!name) return <span className="text-[10px] italic text-gray-400">Unassigned</span>;
  return (
    <span title={name} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-medium text-gray-600">
      {name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
    </span>
  );
}

function DepLine({ label, keys }: { label: string; keys: string[] }) {
  if (keys.length === 0) return null;
  return (
    <div className="flex items-center gap-1 text-[10px] text-gray-500">
      <span className="font-medium">{label}:</span>
      {keys.map((k, i) => (
        <span key={k}>
          <JiraLink issueKey={k} className="text-[10px]" />
          {i < keys.length - 1 ? ", " : ""}
        </span>
      ))}
    </div>
  );
}

function FrontierFlag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      <Flag className="h-3 w-3" />
      Frontier
    </span>
  );
}

/** Variant A: Annotated cards — matches the existing SubtaskKanban card style, flat list. */
function VariantAnnotatedCards() {
  return (
    <div className="space-y-2">
      {MOCK_TICKETS.map((t) => {
        const frontier = isFrontier(t);
        const claimed = isClaimed(t);
        const borderColor = frontier ? "border-l-emerald-400" : t.statusCategory === "done" ? "border-l-green-300" : claimed ? "border-l-blue-300" : "border-l-gray-300";
        return (
          <div key={t.key} className={`rounded border border-gray-200 border-l-4 ${borderColor} bg-white p-2.5 shadow-sm`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <TypeBadge type={t.type} />
                <JiraLink issueKey={t.key} />
              </div>
              <div className="flex items-center gap-1.5">
                {frontier && <FrontierFlag />}
                {statusBadge(t.status)}
              </div>
            </div>
            <p className="mt-1.5 text-xs leading-snug text-gray-700">{t.summary}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <DepLine label="Blocked by" keys={t.blockedBy} />
                <DepLine label="Blocks" keys={t.blocks} />
              </div>
              <Avatar name={t.assignee} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Variant B: Grouped by derived state — Frontier / Claimed / Blocked / Done sections. */
function VariantGroupedByFrontier() {
  const groups: { label: string; color: string; items: WfTicket[] }[] = [
    { label: "Frontier — takeable now", color: "border-emerald-300 bg-emerald-50", items: MOCK_TICKETS.filter((t) => isFrontier(t)) },
    { label: "Claimed", color: "border-blue-300 bg-blue-50", items: MOCK_TICKETS.filter((t) => isClaimed(t)) },
    { label: "Blocked", color: "border-gray-300 bg-gray-50", items: MOCK_TICKETS.filter((t) => t.statusCategory !== "done" && !isClaimed(t) && !isFrontier(t)) },
    { label: "Done", color: "border-green-300 bg-green-50", items: MOCK_TICKETS.filter((t) => t.statusCategory === "done") },
  ];
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.label} className={`rounded-lg border-t-2 ${g.color} p-2.5`}>
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-700">{g.label}</h4>
            <span className="text-[10px] text-gray-400">{g.items.length}</span>
          </div>
          {g.items.length === 0 ? (
            <p className="text-[11px] italic text-gray-400">None</p>
          ) : (
            <div className="space-y-1">
              {g.items.map((t) => (
                <div key={t.key} className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1">
                  <TypeBadge type={t.type} />
                  <JiraLink issueKey={t.key} />
                  <p className="min-w-0 flex-1 truncate text-[11px] text-gray-700">{t.summary}</p>
                  {t.blockedBy.length > 0 && <span className="text-[10px] text-gray-400" title={`Blocked by: ${t.blockedBy.join(", ")}`}>⛔ {t.blockedBy.length}</span>}
                  <Avatar name={t.assignee} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Variant C: Dependency table — dense rows, best for scanning many tickets at once. */
function VariantDependencyTable() {
  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-2 py-1.5 font-medium">Type</th>
            <th className="px-2 py-1.5 font-medium">Ticket</th>
            <th className="px-2 py-1.5 font-medium">Status</th>
            <th className="px-2 py-1.5 font-medium">Assignee</th>
            <th className="px-2 py-1.5 font-medium">Blocked by</th>
            <th className="px-2 py-1.5 font-medium">Blocks</th>
            <th className="px-2 py-1.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {MOCK_TICKETS.map((t) => (
            <tr key={t.key} className="border-t border-gray-100">
              <td className="px-2 py-1.5"><TypeBadge type={t.type} /></td>
              <td className="px-2 py-1.5">
                <JiraLink issueKey={t.key} />
                <span className="ml-1.5 text-gray-600">{t.summary}</span>
              </td>
              <td className="px-2 py-1.5">{statusBadge(t.status)}</td>
              <td className="px-2 py-1.5"><Avatar name={t.assignee} /></td>
              <td className="px-2 py-1.5">
                {t.blockedBy.length === 0 ? <span className="text-gray-300">—</span> : t.blockedBy.map((k) => <JiraLink key={k} issueKey={k} className="mr-1" />)}
              </td>
              <td className="px-2 py-1.5">
                {t.blocks.length === 0 ? <span className="text-gray-300">—</span> : t.blocks.map((k) => <JiraLink key={k} issueKey={k} className="mr-1" />)}
              </td>
              <td className="px-2 py-1.5">{isFrontier(t) && <FrontierFlag />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VARIANTS = {
  A: { name: "Annotated cards", Component: VariantAnnotatedCards },
  B: { name: "Grouped by frontier state", Component: VariantGroupedByFrontier },
  C: { name: "Dependency table", Component: VariantDependencyTable },
} as const;
type VariantKey = keyof typeof VARIANTS;
const KEYS = Object.keys(VARIANTS) as VariantKey[];

function PrototypeSwitcher({ current, onChange }: { current: VariantKey; onChange: (k: VariantKey) => void }) {
  const cycle = (dir: 1 | -1) => {
    const idx = KEYS.indexOf(current);
    onChange(KEYS[(idx + dir + KEYS.length) % KEYS.length]);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <div className="sticky bottom-0 left-0 z-10 mt-3 flex items-center justify-center gap-3 rounded-full border border-gray-300 bg-gray-900 px-3 py-1.5 text-white shadow-lg">
      <button onClick={() => cycle(-1)} className="rounded-full p-1 hover:bg-white/20"><ChevronLeft className="h-4 w-4" /></button>
      <span className="text-xs font-medium">{current} ({VARIANTS[current].name})</span>
      <button onClick={() => cycle(1)} className="rounded-full p-1 hover:bg-white/20"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

export default function WayfinderTabPrototype() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("wf");
  const current: VariantKey = raw && KEYS.includes(raw as VariantKey) ? (raw as VariantKey) : "A";

  const setVariant = (k: VariantKey) => {
    const next = new URLSearchParams(params);
    next.set("wf", k);
    setParams(next, { replace: true });
  };

  const Variant = VARIANTS[current].Component;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 rounded bg-yellow-50 px-2 py-1.5 text-[11px] text-yellow-800">
        <ArrowLeft className="h-3 w-3" /> PROTOTYPE — synthetic data, list/fallback view only (graph view is a separate ticket) <ArrowRight className="h-3 w-3" />
      </div>
      <Variant />
      <PrototypeSwitcher current={current} onChange={setVariant} />
    </div>
  );
}
