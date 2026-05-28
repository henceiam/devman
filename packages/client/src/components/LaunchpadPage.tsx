import { useEffect, useState, useCallback, useRef } from "react";
import { api, type InProgressItem } from "../api/client";
import { statusBadge, getStatusStyle } from "./statusUtils";
import PrStateIcon from "./PrStateIcon";
import StoryDetailModal from "./StoryDetailModal";
import JiraLink from "./JiraLink";

const REFRESH_INTERVAL_MS =
  parseInt(import.meta.env.VITE_LAUNCHPAD_REFRESH_MS || "300000", 10);

const IN_PROGRESS_STATUS_ORDER = ["In Progress", "Code review", "Ready for test"];

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHideUntilDate(duration: "1w" | "1m"): string {
  const d = new Date();
  if (duration === "1w") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return toLocalDateString(d);
}

function todayDateString(): string {
  return toLocalDateString(new Date());
}

function isHidden(item: InProgressItem): boolean {
  return !!item.hideUntil && item.hideUntil >= todayDateString();
}

// ── In-progress item row ─────────────────────────────────────────────────────

function InProgressRow({
  item,
  onOpen,
  onHide,
}: {
  item: InProgressItem;
  onOpen: (key: string) => void;
  onHide: (key: string, duration: "1w" | "1m") => void;
}) {
  const { bgColor } = getStatusStyle(item.status);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="group relative flex w-full items-stretch">
      <button
        onClick={() => onOpen(item.key)}
        className="flex flex-1 items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 pr-9 text-left transition-shadow hover:shadow-md"
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

        {isHidden(item) && (
          <span className="shrink-0 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
            Hidden until {item.hideUntil}
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

        {/* Progress bar */}
        {item.progress && item.progress.total > 0 && (() => {
          const { done, inProgress, total } = item.progress;
          const donePct = (done / total) * 100;
          const inProgPct = (inProgress / total) * 100;
          return (
            <div className="shrink-0 flex items-center gap-1.5">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 flex">
                <div className="h-full bg-green-500" style={{ width: `${donePct}%` }} />
                <div className="h-full bg-orange-400" style={{ width: `${inProgPct}%` }} />
              </div>
              <span className="text-[10px] text-gray-400">
                {done}/{total}
              </span>
            </div>
          );
        })()}

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

      {/* Context menu */}
      <div ref={menuRef} className="absolute right-1 top-1/2 z-10 -translate-y-1/2">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
          title="Hide options"
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => { onHide(item.key, "1w"); setMenuOpen(false); }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Hide for 1 week
            </button>
            <button
              onClick={() => { onHide(item.key, "1m"); setMenuOpen(false); }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Hide for 1 month
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function LaunchpadPage() {
  const [inProgress, setInProgress] = useState<InProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedStoryKey, setSelectedStoryKey] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const inp = await api.launchpad.getInProgress();
      setInProgress(inp.items);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleHide = useCallback(async (key: string, duration: "1w" | "1m") => {
    const hideUntil = getHideUntilDate(duration);
    setInProgress((prev) => prev.map((i) => i.key === key ? { ...i, hideUntil } : i));
    try {
      await api.launchpad.hideIssue(key, hideUntil);
    } catch {
      fetchAll();
    }
  }, [fetchAll]);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  // Keyboard shortcuts: R = manual refresh, H = toggle hidden tickets
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "r" || e.key === "R") && !selectedStoryKey) {
        fetchAll();
      } else if (e.key === "h" || e.key === "H") {
        setShowHidden((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fetchAll, selectedStoryKey]);

  const hiddenCount = inProgress.filter(isHidden).length;
  const visibleInProgress = showHidden ? inProgress : inProgress.filter((i) => !isHidden(i));

  // Group in-progress by status in display order, epics first within each group
  const grouped = IN_PROGRESS_STATUS_ORDER.map((status) => ({
    status,
    items: visibleInProgress
      .filter((i) => i.status === status)
      .sort((a, b) => (a.type === "Epic" ? -1 : b.type === "Epic" ? 1 : 0)),
  })).filter((g) => g.items.length > 0);

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
          {/* ── In-progress work ── */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-800">
              <span className="text-blue-500">▶</span>
              In Progress
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {visibleInProgress.length}
              </span>
              <span className="ml-auto flex items-center gap-3 text-[11px] text-gray-400">
                {!showHidden && hiddenCount > 0 && (
                  <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">{hiddenCount} hidden</span>
                )}
                {showHidden && (
                  <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">Hidden shown</span>
                )}
                <span><kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5">H</kbd> hidden</span>
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
                          <InProgressRow key={item.key} item={item} onOpen={setSelectedStoryKey} onHide={handleHide} />
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
