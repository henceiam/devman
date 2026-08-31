import { Search, FlaskConical, MessageSquare, ListChecks, Circle } from "lucide-react";
import JiraLink from "./JiraLink";
import { deriveState, type DerivedState } from "./wayfinderUtils";
import type { WayfinderTicket, WayfinderTicketType } from "../api/client";

const TYPE_META: Record<NonNullable<WayfinderTicketType>, { label: string; icon: React.ReactNode; color: string }> = {
  research: { label: "Research", icon: <Search className="h-3 w-3" />, color: "bg-sky-100 text-sky-700" },
  prototype: { label: "Prototype", icon: <FlaskConical className="h-3 w-3" />, color: "bg-violet-100 text-violet-700" },
  grilling: { label: "Grilling", icon: <MessageSquare className="h-3 w-3" />, color: "bg-amber-100 text-amber-700" },
  task: { label: "Task", icon: <ListChecks className="h-3 w-3" />, color: "bg-gray-200 text-gray-700" },
};

function TypeBadge({ type }: { type: WayfinderTicketType }) {
  const meta = type
    ? TYPE_META[type]
    : { label: "Unknown", icon: <Circle className="h-3 w-3" />, color: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (name === "Unassigned") return <span className="shrink-0 text-[10px] italic text-gray-400">Unassigned</span>;
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} title={name} className="h-5 w-5 shrink-0 rounded-full" />;
  }
  return (
    <span title={name} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-medium text-gray-600">
      {name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
    </span>
  );
}

const GROUPS: { state: DerivedState; label: string; color: string }[] = [
  { state: "frontier", label: "Frontier — takeable now", color: "border-emerald-300 bg-emerald-50" },
  { state: "claimed", label: "Claimed", color: "border-blue-300 bg-blue-50" },
  { state: "blocked", label: "Blocked", color: "border-gray-300 bg-gray-50" },
  { state: "done", label: "Done", color: "border-green-300 bg-green-50" },
];

export default function WayfinderList({ tickets }: { tickets: WayfinderTicket[] }) {
  const withState = tickets.map((ticket) => ({ ticket, state: deriveState(ticket, tickets) }));

  return (
    <div className="space-y-3">
      {GROUPS.map((group) => {
        const items = withState.filter((x) => x.state === group.state).map((x) => x.ticket);
        return (
          <div key={group.state} className={`rounded-lg border-t-2 ${group.color} p-2.5`}>
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-700">{group.label}</h4>
              <span className="text-[10px] text-gray-400">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-[11px] italic text-gray-400">None</p>
            ) : (
              <div className="space-y-1">
                {items.map((t) => (
                  <div key={t.key} className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1">
                    <TypeBadge type={t.type} />
                    <JiraLink issueKey={t.key} />
                    <p className="min-w-0 flex-1 truncate text-[11px] text-gray-700">{t.summary}</p>
                    {t.blockedBy.length > 0 && (
                      <span className="shrink-0 text-[10px] text-gray-400" title={`Blocked by: ${t.blockedBy.join(", ")}`}>
                        ⛔ {t.blockedBy.length}
                      </span>
                    )}
                    <Avatar name={t.assignee} avatarUrl={t.avatarUrl} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
