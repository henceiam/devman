import { useEffect, useState, useCallback, useRef } from "react";
import { api, type EscalatedTicket, type InProgressItem } from "../api/client";
import { statusBadge, getStatusStyle } from "./statusUtils";
import PrStateIcon from "./PrStateIcon";
import StoryDetailModal from "./StoryDetailModal";
import JiraLink from "./JiraLink";

const REFRESH_INTERVAL_MS =
  parseInt(import.meta.env.VITE_LAUNCHPAD_REFRESH_MS || "300000", 10);

const PRIORITY_ORDER: Record<string, number> = {
  Blocker: 0, Critical: 1, Major: 2, Medium: 3, Minor: 4, Trivial: 5,
};

const PRIORITY_COLORS: Record<string, string> = {
  Blocker: "bg-red-100 text-red-700",
  Critical: "bg-red-100 text-red-700",
  Major: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Minor: "bg-blue-100 text-blue-700",
  Trivial: "bg-gray-100 text-gray-500",
};

const IN_PROGRESS_STATUS_ORDER = ["In Progress", "Code review", "Ready for test"];

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1mo ago";
  return `${months}mo ago`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Escalated ticket card ────────────────────────────────────────────────────

function EscalatedCard({ ticket }: { ticket: EscalatedTicket }) {
  const priorityCls = PRIORITY_COLORS[ticket.priority] ?? "bg-gray-100 text-gray-500";

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {ticket.avatarUrl ? (
            <img src={ticket.avatarUrl} alt={ticket.assignee} className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
              {ticket.assignee.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2">
            <JiraLink issueKey={ticket.key} className="font-semibold text-orange-700" />
            {statusBadge(ticket.status)}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityCls}`}>
              {ticket.priority}
            </span>
            {ticket.prState && <PrStateIcon state={ticket.prState} />}
            <span className="ml-auto text-xs text-gray-400">{timeAgo(ticket.created)}</span>
          </div>

          {/* Summary */}
          <p className="mt-1 text-sm text-gray-800">{ticket.summary}</p>
          <p className="text-xs text-gray-500">{ticket.assignee}</p>

          {/* Linked SUPPORT ticket */}
          {ticket.supportTicket && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-orange-200 bg-white px-3 py-1.5 text-xs">
              <JiraLink issueKey={ticket.supportTicket.key} className="font-semibold text-gray-600" />
              {statusBadge(ticket.supportTicket.status)}
              <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_COLORS[ticket.supportTicket.priority] ?? "bg-gray-100 text-gray-500"}`}>
                {ticket.supportTicket.priority}
              </span>
              <span className="text-gray-700">{ticket.supportTicket.summary}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── In-progress item row ─────────────────────────────────────────────────────

function InProgressRow({
  item,
  onOpen,
}: {
  item: InProgressItem;
  onOpen: (key: string) => void;
}) {
  const { bgColor } = getStatusStyle(item.status);

  return (
    <button
      onClick={() => onOpen(item.key)}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-left transition-shadow hover:shadow-md"
      style={{ backgroundColor: bgColor }}
    >
      {/* Type badge */}
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${item.type === "Epic" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
        {item.type}
      </span>

      {/* Key */}
      <span className="w-36 shrink-0">
        <JiraLink issueKey={item.key} />
      </span>

      {/* Summary */}
      <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{item.summary}</span>

      {/* Milestone */}
      {item.milestone && (
        <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {item.milestone}
        </span>
      )}

      {/* Size */}
      {item.size && (
        <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {item.size}
        </span>
      )}

      {/* PR icon */}
      {item.prState && <PrStateIcon state={item.prState} />}

      {/* Avatar */}
      <div className="shrink-0">
        {item.avatarUrl ? (
          <img src={item.avatarUrl} alt={item.assignee} className="h-6 w-6 rounded-full" title={item.assignee} />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600" title={item.assignee}>
            {item.assignee.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function LaunchpadPage() {
  const [escalated, setEscalated] = useState<EscalatedTicket[]>([]);
  const [inProgress, setInProgress] = useState<InProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedStoryKey, setSelectedStoryKey] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [esc, inp] = await Promise.all([
        api.launchpad.getEscalated(),
        api.launchpad.getInProgress(),
      ]);
      setEscalated(esc.tickets);
      setInProgress(inp.items);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  // R key = manual refresh
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "r" || e.key === "R") && !selectedStoryKey) {
        fetchAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fetchAll, selectedStoryKey]);

  // Group in-progress by status in display order
  const grouped = IN_PROGRESS_STATUS_ORDER.map((status) => ({
    status,
    items: inProgress.filter((i) => i.status === status),
  })).filter((g) => g.items.length > 0);

  // Sort escalated by priority
  const sortedEscalated = [...escalated].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Launchpad</h2>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-gray-400">
              Updated {formatTime(lastRefreshed.toISOString())}
            </span>
          )}
          <button
            onClick={fetchAll}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            title="Refresh (R)"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-12">Loading…</div>
      ) : (
        <>
          {/* ── Escalated support tickets ── */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-800">
              <span className="text-orange-500">⚠</span>
              Escalated Support Tickets
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                {sortedEscalated.length}
              </span>
            </h3>
            {sortedEscalated.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
                No escalated tickets 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {sortedEscalated.map((t) => (
                  <EscalatedCard key={t.key} ticket={t} />
                ))}
              </div>
            )}
          </section>

          {/* ── In-progress work ── */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-800">
              <span className="text-blue-500">▶</span>
              In Progress
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {inProgress.length}
              </span>
            </h3>
            {grouped.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
                Nothing in progress
              </p>
            ) : (
              <div className="space-y-5">
                {grouped.map(({ status, items }) => {
                  const { dotColor } = getStatusStyle(status);
                  return (
                    <div key={status}>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="text-sm font-semibold text-gray-700">{status}</span>
                        <span className="text-xs text-gray-400">({items.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <InProgressRow key={item.key} item={item} onOpen={setSelectedStoryKey} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Story detail modal */}
      {selectedStoryKey && (
        <StoryDetailModal
          storyKey={selectedStoryKey}
          hideDone={false}
          onClose={() => setSelectedStoryKey(null)}
        />
      )}
    </main>
  );
}
