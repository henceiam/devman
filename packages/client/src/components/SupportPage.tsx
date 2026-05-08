import { useEffect, useState, useCallback, useRef } from "react";
import { api, type EscalatedTicket } from "../api/client";
import { statusBadge } from "./statusUtils";
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

function EscalatedCard({ ticket, onOpen }: { ticket: EscalatedTicket; onOpen: (key: string) => void }) {
  const priorityCls = PRIORITY_COLORS[ticket.priority] ?? "bg-gray-100 text-gray-500";

  return (
    <button
      onClick={() => onOpen(ticket.key)}
      className="w-full rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm text-left hover:shadow-md transition-shadow"
    >
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
    </button>
  );
}

export default function SupportPage() {
  const [escalated, setEscalated] = useState<EscalatedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const data = await api.launchpad.getEscalated();
      setEscalated(data.tickets);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "r" || e.key === "R") && !selectedKey) fetchAll();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fetchAll, selectedKey]);

  const sorted = [...escalated].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
  );

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <span className="text-orange-500">⚠</span>
          Escalated Support Tickets
          {!loading && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-sm font-medium text-orange-700">
              {sorted.length}
            </span>
          )}
        </h2>
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
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          No escalated tickets 🎉
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((t) => (
            <EscalatedCard key={t.key} ticket={t} onOpen={setSelectedKey} />
          ))}
        </div>
      )}

      {selectedKey && (
        <StoryDetailModal
          storyKey={selectedKey}
          hideDone={false}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </main>
  );
}
