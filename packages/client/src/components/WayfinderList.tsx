import JiraLink from "./JiraLink";
import { deriveState, type DerivedState } from "./wayfinderUtils";
import { wayfinderTypeMeta, WayfinderAvatar } from "./wayfinderBadges";
import type { WayfinderTicket, WayfinderTicketType } from "../api/client";

function TypeBadge({ type }: { type: WayfinderTicketType }) {
  const meta = wayfinderTypeMeta(type);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
      {meta.icon}
      {meta.label}
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
                    <WayfinderAvatar name={t.assignee} avatarUrl={t.avatarUrl} />
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
