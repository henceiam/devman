import { useState } from "react";
import type { WayfinderTicket } from "../api/client";
import WayfinderGraph from "./WayfinderGraph";
import WayfinderList from "./WayfinderList";

const LIST_DEFAULT_TICKET_THRESHOLD = 14;

const VIEWS: { key: "graph" | "list"; label: string }[] = [
  { key: "graph", label: "Graph" },
  { key: "list", label: "List" },
];

export default function WayfinderTab({ tickets }: { tickets: WayfinderTicket[] }) {
  const [view, setView] = useState<"graph" | "list">(
    tickets.length >= LIST_DEFAULT_TICKET_THRESHOLD ? "list" : "graph",
  );

  return (
    <div>
      <div className="mb-2 flex w-fit items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              view === v.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === "graph" ? <WayfinderGraph tickets={tickets} /> : <WayfinderList tickets={tickets} />}
    </div>
  );
}
