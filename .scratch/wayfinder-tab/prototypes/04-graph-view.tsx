// PROTOTYPE — throwaway UI exploration for .scratch/wayfinder-tab/issues/04-prototype-graph-view.md
// Three variants of the default DAG (graph) view for the Wayfinder tab, switchable via ?wf=A|B|C,
// each paired with a small and a dense synthetic dataset (?wfdata=small|dense) to probe when the
// graph stops being legible and the list view (ticket 03) should take over instead.
// Uses synthetic mock data. Not wired to real Jira. Not meant to survive past the prototype decision.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Search, FlaskConical, MessageSquare, ListChecks, Flag, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft, ZoomIn, ZoomOut, Maximize2, AlertTriangle } from "lucide-react";
import { getStatusStyle } from "./statusUtils";

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
}

// Same shape/story as the ticket-03 list-view prototype's mock data, for continuity.
const SMALL_TICKETS: WfTicket[] = [
  { key: "WF-1", summary: "Define API contract", type: "grilling", status: "Closed", statusCategory: "done", assignee: "Henric Johansson", blockedBy: [] },
  { key: "WF-2", summary: "Research bulk-fetch feasibility", type: "research", status: "Closed", statusCategory: "done", assignee: "Henric Johansson", blockedBy: ["WF-1"] },
  { key: "WF-3", summary: "Prototype list view", type: "prototype", status: "In Progress", statusCategory: "indeterminate", assignee: "Henric Johansson", blockedBy: ["WF-2"] },
  { key: "WF-4", summary: "Prototype graph view", type: "prototype", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-2"] },
  { key: "WF-5", summary: "Apply example labels in real Jira", type: "task", status: "To do", statusCategory: "new", assignee: null, blockedBy: [] },
  { key: "WF-6", summary: "Finalize implementation spec", type: "grilling", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-3", "WF-4"] },
  { key: "WF-7", summary: "Old spike: graph libraries", type: "research", status: "Rejected", statusCategory: "done", assignee: "Henric Johansson", blockedBy: [] },
];

// A denser, wider, multi-layer graph (fan-out + fan-in + cross-links) meant to stress-test
// legibility: 24 tickets across 6 layers, several nodes sharing blockers/blockees.
const DENSE_TICKETS: WfTicket[] = [
  { key: "WF-10", summary: "Kickoff: scope the migration", type: "grilling", status: "Closed", statusCategory: "done", assignee: "Alice Nyström", blockedBy: [] },
  { key: "WF-11", summary: "Inventory legacy consumers", type: "research", status: "Closed", statusCategory: "done", assignee: "Bo Lindqvist", blockedBy: ["WF-10"] },
  { key: "WF-12", summary: "Inventory data sources", type: "research", status: "Closed", statusCategory: "done", assignee: "Alice Nyström", blockedBy: ["WF-10"] },
  { key: "WF-13", summary: "Draft schema v2", type: "prototype", status: "Closed", statusCategory: "done", assignee: "Cissi Berg", blockedBy: ["WF-11", "WF-12"] },
  { key: "WF-14", summary: "Draft rollout plan", type: "grilling", status: "Closed", statusCategory: "done", assignee: "Bo Lindqvist", blockedBy: ["WF-11"] },
  { key: "WF-15", summary: "Spike: dual-write feasibility", type: "research", status: "In Progress", statusCategory: "indeterminate", assignee: "David Ek", blockedBy: ["WF-13"] },
  { key: "WF-16", summary: "Spike: backfill throughput", type: "research", status: "In Progress", statusCategory: "indeterminate", assignee: "Erik Holm", blockedBy: ["WF-13"] },
  { key: "WF-17", summary: "Prototype admin UI for cutover", type: "prototype", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-13", "WF-14"] },
  { key: "WF-18", summary: "Grill: rollback strategy", type: "grilling", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-14"] },
  { key: "WF-19", summary: "Task: provision staging cluster", type: "task", status: "In Progress", statusCategory: "indeterminate", assignee: "Alice Nyström", blockedBy: ["WF-13"] },
  { key: "WF-20", summary: "Research: monitoring/alerting gaps", type: "research", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-15"] },
  { key: "WF-21", summary: "Research: index strategy", type: "research", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-16"] },
  { key: "WF-22", summary: "Prototype: read-path fallback", type: "prototype", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-15", "WF-16"] },
  { key: "WF-23", summary: "Task: seed staging fixtures", type: "task", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-19"] },
  { key: "WF-24", summary: "Grill: SLA for dual-write lag", type: "grilling", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-15", "WF-18"] },
  { key: "WF-25", summary: "Research: index build cost", type: "research", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-21"] },
  { key: "WF-26", summary: "Prototype: cutover runbook UI", type: "prototype", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-17", "WF-18"] },
  { key: "WF-27", summary: "Task: dry-run backfill on staging", type: "task", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-16", "WF-23"] },
  { key: "WF-28", summary: "Grill: go/no-go criteria", type: "grilling", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-20", "WF-22"] },
  { key: "WF-29", summary: "Research: query planner regressions", type: "research", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-25"] },
  { key: "WF-30", summary: "Prototype: post-cutover dashboards", type: "prototype", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-24", "WF-27"] },
  { key: "WF-31", summary: "Task: schedule cutover window", type: "task", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-26", "WF-28"] },
  { key: "WF-32", summary: "Grill: comms plan for downtime", type: "grilling", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-28"] },
  { key: "WF-33", summary: "Finalize cutover spec", type: "grilling", status: "To do", statusCategory: "new", assignee: null, blockedBy: ["WF-29", "WF-30", "WF-31", "WF-32"] },
];

const TYPE_META: Record<WfType, { label: string; icon: React.ReactNode; color: string }> = {
  research: { label: "Research", icon: <Search className="h-3 w-3" />, color: "bg-sky-100 text-sky-700" },
  prototype: { label: "Prototype", icon: <FlaskConical className="h-3 w-3" />, color: "bg-violet-100 text-violet-700" },
  grilling: { label: "Grilling", icon: <MessageSquare className="h-3 w-3" />, color: "bg-amber-100 text-amber-700" },
  task: { label: "Task", icon: <ListChecks className="h-3 w-3" />, color: "bg-gray-200 text-gray-700" },
};

/** Icon-only type marker — the full label lives in the tooltip, not on-card (no room for text there). */
function TypeBadge({ type }: { type: WfType }) {
  const meta = TYPE_META[type];
  return (
    <span title={meta.label} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
      {meta.icon}
    </span>
  );
}

function Avatar({ name }: { name: string | null }) {
  if (!name) return <span className="text-[9px] italic text-gray-400">Unassigned</span>;
  return (
    <span title={name} className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[8px] font-medium text-gray-600">
      {name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
    </span>
  );
}

/** Icon-only frontier marker — a small badge, not the full "Frontier" pill (no room for text there). */
function FrontierFlag() {
  return (
    <span title="Frontier — takeable now" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
      <Flag className="h-2.5 w-2.5" />
    </span>
  );
}

// ---- Graph layout: layer nodes by longest-path depth from roots (no blockers), lay each
// layer out left-to-right, layers stacked top-to-bottom (reads naturally in a narrow modal). ----

interface LayoutNode {
  ticket: WfTicket;
  layer: number;
  col: number;
  x: number;
  y: number;
}

const NODE_W = 148;
const NODE_H = 60;
const COL_GAP = 24;
const ROW_GAP = 44;

function layout(tickets: WfTicket[]): { nodes: LayoutNode[]; edges: { from: LayoutNode; to: LayoutNode }[]; width: number; height: number } {
  const byKey = new Map(tickets.map((t) => [t.key, t]));
  const layerOf = new Map<string, number>();

  function depth(key: string, seen: Set<string>): number {
    if (layerOf.has(key)) return layerOf.get(key)!;
    if (seen.has(key)) return 0; // guard against accidental cycles in mock data
    seen.add(key);
    const t = byKey.get(key);
    if (!t || t.blockedBy.length === 0) {
      layerOf.set(key, 0);
      return 0;
    }
    const d = 1 + Math.max(...t.blockedBy.map((b) => depth(b, seen)));
    layerOf.set(key, d);
    return d;
  }
  for (const t of tickets) depth(t.key, new Set());

  const layers = new Map<number, WfTicket[]>();
  for (const t of tickets) {
    const l = layerOf.get(t.key)!;
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(t);
  }

  const nodes: LayoutNode[] = [];
  const nodeByKey = new Map<string, LayoutNode>();
  const maxLayer = Math.max(...layers.keys());
  let maxCols = 0;
  for (let l = 0; l <= maxLayer; l++) {
    const row = layers.get(l) ?? [];
    maxCols = Math.max(maxCols, row.length);
    row.forEach((t, col) => {
      const node: LayoutNode = { ticket: t, layer: l, col, x: col * (NODE_W + COL_GAP), y: l * (NODE_H + ROW_GAP) };
      nodes.push(node);
      nodeByKey.set(t.key, node);
    });
  }

  const edges: { from: LayoutNode; to: LayoutNode }[] = [];
  for (const t of tickets) {
    const to = nodeByKey.get(t.key)!;
    for (const b of t.blockedBy) {
      const from = nodeByKey.get(b);
      if (from) edges.push({ from, to });
    }
  }

  return {
    nodes,
    edges,
    width: maxCols * (NODE_W + COL_GAP),
    height: (maxLayer + 1) * (NODE_H + ROW_GAP),
  };
}

function isUnblocked(t: WfTicket, byKey: Map<string, WfTicket>): boolean {
  return t.blockedBy.every((k) => byKey.get(k)?.statusCategory === "done");
}
function isFrontier(t: WfTicket, byKey: Map<string, WfTicket>): boolean {
  return t.statusCategory !== "done" && t.assignee === null && isUnblocked(t, byKey);
}

// Name is the priority: it gets the most space and the largest text on the card.
// Type/frontier are icon-only badges; the key is a muted corner label, not a headline.
function Node({ node, frontier }: { node: LayoutNode; frontier: boolean }) {
  const t = node.ticket;
  const ring = frontier ? "ring-2 ring-emerald-400" : t.statusCategory === "done" ? "opacity-60" : "";
  const { dotColor } = getStatusStyle(t.status);
  return (
    <div
      className={`absolute flex flex-col gap-1 rounded-md border border-gray-200 bg-white p-1.5 shadow-sm ${ring}`}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
    >
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} title={t.status} />
        <TypeBadge type={t.type} />
        {frontier && <FrontierFlag />}
        <p className="min-w-0 flex-1 truncate text-[9px] font-mono text-gray-400" title={t.key}>{t.key}</p>
        <Avatar name={t.assignee} />
      </div>
      <p className="line-clamp-2 flex-1 text-[10px] font-medium leading-tight text-gray-800">{t.summary}</p>
    </div>
  );
}

function Edges({ edges, width, height }: { edges: { from: LayoutNode; to: LayoutNode }[]; width: number; height: number }) {
  return (
    <svg className="absolute left-0 top-0" width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <marker id="wf-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const x1 = e.from.x + NODE_W / 2;
        const y1 = e.from.y + NODE_H;
        const x2 = e.to.x + NODE_W / 2;
        const y2 = e.to.y;
        const midY = (y1 + y2) / 2;
        return (
          <path
            key={i}
            d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={1.5}
            markerEnd="url(#wf-arrow)"
          />
        );
      })}
    </svg>
  );
}

function Legend() {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[10px] text-gray-500">
      <ArrowRight className="h-3 w-3" />
      <span>Arrows point from a blocker to what it unblocks (read top to bottom)</span>
    </div>
  );
}

/** Variant A: plain layered graph, relies on the modal's own vertical scroll for overflow. */
function VariantScroll({ tickets }: { tickets: WfTicket[] }) {
  const byKey = useMemo(() => new Map(tickets.map((t) => [t.key, t])), [tickets]);
  const { nodes, edges, width, height } = useMemo(() => layout(tickets), [tickets]);
  return (
    <div>
      <Legend />
      <div className="overflow-x-auto rounded border border-gray-100 bg-gray-50 p-3">
        <div className="relative" style={{ width, height }}>
          <Edges edges={edges} width={width} height={height} />
          {nodes.map((n) => (
            <Node key={n.ticket.key} node={n} frontier={isFrontier(n.ticket, byKey)} />
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400">No pan/zoom — the browser's own scrollbars (horizontal + the modal's vertical) handle overflow. Fine while a layer stays a few nodes wide; wide layers force horizontal scrolling that hides context off-screen.</p>
    </div>
  );
}

/** Variant B: same layered graph, but rendered in a fixed viewport with drag-to-pan + zoom buttons. */
function VariantPanZoom({ tickets }: { tickets: WfTicket[] }) {
  const byKey = useMemo(() => new Map(tickets.map((t) => [t.key, t])), [tickets]);
  const { nodes, edges, width, height } = useMemo(() => layout(tickets), [tickets]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 12, y: 12 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };
  const onMouseUp = () => { dragRef.current = null; };

  const resetView = () => { setZoom(1); setPan({ x: 12, y: 12 }); };

  return (
    <div>
      <Legend />
      <div className="mb-1.5 flex items-center gap-1">
        <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))} className="rounded border border-gray-200 p-1 hover:bg-gray-100"><ZoomOut className="h-3.5 w-3.5" /></button>
        <span className="w-10 text-center text-[10px] text-gray-500">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, z + 0.15))} className="rounded border border-gray-200 p-1 hover:bg-gray-100"><ZoomIn className="h-3.5 w-3.5" /></button>
        <button onClick={resetView} className="rounded border border-gray-200 p-1 hover:bg-gray-100"><Maximize2 className="h-3.5 w-3.5" /></button>
        <span className="ml-1 text-[10px] text-gray-400">Drag to pan, buttons to zoom</span>
      </div>
      <div
        className="relative h-72 cursor-grab overflow-hidden rounded border border-gray-100 bg-gray-50 active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className="absolute" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          <div className="relative" style={{ width, height }}>
            <Edges edges={edges} width={width} height={height} />
            {nodes.map((n) => (
              <Node key={n.ticket.key} node={n} frontier={isFrontier(n.ticket, byKey)} />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400">Fixed viewport, nodes stay full-size — pan/zoom to navigate. Scales to any graph size without shrinking node content, but costs an extra interaction step even for small graphs, and there's no overview until you zoom out yourself.</p>
    </div>
  );
}

const CLUTTER_NODE_THRESHOLD = 14;

/** Variant C: auto-fit the whole graph to the viewport; past a density threshold, admit defeat and point at the list view. */
function VariantAutoFitShrink({ tickets }: { tickets: WfTicket[] }) {
  const byKey = useMemo(() => new Map(tickets.map((t) => [t.key, t])), [tickets]);
  const { nodes, edges, width, height } = useMemo(() => layout(tickets), [tickets]);
  const viewportW = 620;
  const viewportH = 320;
  const fitScale = Math.min(1, viewportW / width, viewportH / height);
  const tooDense = tickets.length > CLUTTER_NODE_THRESHOLD || fitScale < 0.55;

  return (
    <div>
      <Legend />
      {tooDense && (
        <div className="mb-2 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {tickets.length} tickets need to shrink to {Math.round(fitScale * 100)}% to fit — labels stop being readable past this point.
            Switch to the <strong>list view</strong> for graphs this dense; treat this as roughly the threshold ({CLUTTER_NODE_THRESHOLD}+ tickets, or a fit below ~55%).
          </span>
        </div>
      )}
      <div className="relative overflow-hidden rounded border border-gray-100 bg-gray-50" style={{ width: viewportW, height: viewportH }}>
        <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%, -50%) scale(${fitScale})` }}>
          <div className="relative" style={{ width, height }}>
            <Edges edges={edges} width={width} height={height} />
            {nodes.map((n) => (
              <Node key={n.ticket.key} node={n} frontier={isFrontier(n.ticket, byKey)} />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400">Whole graph always visible at once (no interaction needed), scaled to fit — but text quickly becomes unreadable as the ticket count grows, which is exactly the fallback signal: this variant's own illegibility is the cue to offer the list view.</p>
    </div>
  );
}

const VARIANTS = {
  A: { name: "Scroll (no pan/zoom)", Component: VariantScroll },
  B: { name: "Pan & zoom canvas", Component: VariantPanZoom },
  C: { name: "Auto-fit shrink + clutter banner", Component: VariantAutoFitShrink },
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

export default function WayfinderGraphPrototype() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("wf");
  const current: VariantKey = raw && KEYS.includes(raw as VariantKey) ? (raw as VariantKey) : "A";
  const dataKey = params.get("wfdata") === "dense" ? "dense" : "small";
  const tickets = dataKey === "dense" ? DENSE_TICKETS : SMALL_TICKETS;

  const setVariant = (k: VariantKey) => {
    const next = new URLSearchParams(params);
    next.set("wf", k);
    setParams(next, { replace: true });
  };
  const setData = (d: "small" | "dense") => {
    const next = new URLSearchParams(params);
    next.set("wfdata", d);
    setParams(next, { replace: true });
  };

  const Variant = VARIANTS[current].Component;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 rounded bg-yellow-50 px-2 py-1.5 text-[11px] text-yellow-800">
        <span className="flex items-center gap-2">
          <ArrowLeft className="h-3 w-3" /> PROTOTYPE — synthetic data, default graph view only (list view is a separate, already-resolved ticket) <ArrowRight className="h-3 w-3" />
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white/70 p-0.5">
          <button onClick={() => setData("small")} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${dataKey === "small" ? "bg-yellow-800 text-white" : "text-yellow-800"}`}>Small (7)</button>
          <button onClick={() => setData("dense")} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${dataKey === "dense" ? "bg-yellow-800 text-white" : "text-yellow-800"}`}>Dense (24)</button>
        </span>
      </div>
      <Variant tickets={tickets} />
      <PrototypeSwitcher current={current} onChange={setVariant} />
    </div>
  );
}
