import { useMemo, useRef, useState } from "react";
import { ArrowRight, Flag, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { getStatusStyle } from "./statusUtils";
import { deriveState, type DerivedState } from "./wayfinderUtils";
import { wayfinderTypeMeta, WayfinderAvatar } from "./wayfinderBadges";
import type { WayfinderTicket } from "../api/client";

interface LayoutNode {
  ticket: WayfinderTicket;
  x: number;
  y: number;
}

const NODE_W = 160;
const NODE_H = 64;
const COL_GAP = 24;
const ROW_GAP = 44;

function layoutGraph(tickets: WayfinderTicket[]): { nodes: LayoutNode[]; edges: { from: LayoutNode; to: LayoutNode }[]; width: number; height: number } {
  const byKey = new Map(tickets.map((t) => [t.key, t]));
  const layerOf = new Map<string, number>();

  function layerFor(key: string, seen: Set<string>): number {
    if (layerOf.has(key)) return layerOf.get(key)!;
    if (seen.has(key)) return 0;
    seen.add(key);
    const ticket = byKey.get(key);
    if (!ticket || ticket.blockedBy.length === 0) {
      layerOf.set(key, 0);
      return 0;
    }
    const layer = 1 + Math.max(...ticket.blockedBy.map((k) => layerFor(k, seen)));
    layerOf.set(key, layer);
    return layer;
  }
  for (const t of tickets) layerFor(t.key, new Set());

  const rows = new Map<number, WayfinderTicket[]>();
  for (const t of tickets) {
    const layer = layerOf.get(t.key)!;
    if (!rows.has(layer)) rows.set(layer, []);
    rows.get(layer)!.push(t);
  }

  const nodes: LayoutNode[] = [];
  const nodeByKey = new Map<string, LayoutNode>();
  const maxLayer = tickets.length > 0 ? Math.max(...rows.keys()) : -1;
  let maxCols = 0;
  for (let layer = 0; layer <= maxLayer; layer++) {
    const row = rows.get(layer) ?? [];
    maxCols = Math.max(maxCols, row.length);
    row.forEach((ticket, col) => {
      const node: LayoutNode = { ticket, x: col * (NODE_W + COL_GAP), y: layer * (NODE_H + ROW_GAP) };
      nodes.push(node);
      nodeByKey.set(ticket.key, node);
    });
  }

  const edges: { from: LayoutNode; to: LayoutNode }[] = [];
  for (const t of tickets) {
    const to = nodeByKey.get(t.key)!;
    for (const blockerKey of t.blockedBy) {
      const from = nodeByKey.get(blockerKey);
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

function Node({ node, state }: { node: LayoutNode; state: DerivedState }) {
  const t = node.ticket;
  const typeMeta = wayfinderTypeMeta(t.type);
  const { dotColor } = getStatusStyle(t.status);
  const ring = state === "frontier" ? "ring-2 ring-emerald-400" : state === "done" ? "opacity-60" : "";

  return (
    <div
      className={`absolute flex flex-col gap-1 rounded-md border border-gray-200 bg-white p-1.5 shadow-sm ${ring}`}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
    >
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} title={t.status} />
        <span title={typeMeta.label} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${typeMeta.color}`}>
          {typeMeta.icon}
        </span>
        {state === "frontier" && (
          <span title="Frontier — takeable now" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Flag className="h-2.5 w-2.5" />
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-[9px] font-mono text-gray-400" title={t.key}>{t.key}</p>
        <WayfinderAvatar name={t.assignee} avatarUrl={t.avatarUrl} size="h-4 w-4" />
      </div>
      <p className="line-clamp-2 flex-1 text-[10px] font-medium leading-tight text-gray-800">{t.summary}</p>
    </div>
  );
}

function Edges({ edges, width, height }: { edges: { from: LayoutNode; to: LayoutNode }[]; width: number; height: number }) {
  return (
    <svg className="absolute left-0 top-0" width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <marker id="wf-graph-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
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
            markerEnd="url(#wf-graph-arrow)"
          />
        );
      })}
    </svg>
  );
}

export default function WayfinderGraph({ tickets }: { tickets: WayfinderTicket[] }) {
  const { nodes, edges, width, height } = useMemo(() => layoutGraph(tickets), [tickets]);
  const stateByKey = useMemo(
    () => new Map(tickets.map((t) => [t.key, deriveState(t, tickets)])),
    [tickets],
  );

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
      <div className="mb-2 flex items-center gap-1.5 text-[10px] text-gray-500">
        <ArrowRight className="h-3 w-3" />
        <span>Arrows point from a blocker to what it unblocks (read top to bottom)</span>
      </div>
      <div className="mb-1.5 flex items-center gap-1">
        <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))} className="rounded border border-gray-200 p-1 hover:bg-gray-100">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="w-10 text-center text-[10px] text-gray-500">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, z + 0.15))} className="rounded border border-gray-200 p-1 hover:bg-gray-100">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={resetView} className="rounded border border-gray-200 p-1 hover:bg-gray-100">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <span className="ml-1 text-[10px] text-gray-400">Drag to pan, buttons to zoom</span>
      </div>
      <div
        className="relative h-80 cursor-grab overflow-hidden rounded border border-gray-100 bg-gray-50 active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className="absolute" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          <div className="relative" style={{ width, height }}>
            <Edges edges={edges} width={width} height={height} />
            {nodes.map((n) => (
              <Node key={n.ticket.key} node={n} state={stateByKey.get(n.ticket.key)!} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
