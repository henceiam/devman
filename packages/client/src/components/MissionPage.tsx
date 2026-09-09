import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { api, type MissionSummary, type MissionDetail } from "../api/client";
import { useAppChrome } from "../AppChrome";
import JiraLink from "./JiraLink";
import MilestoneWorkspace from "./MilestoneWorkspace";
import StoryDetailModal from "./StoryDetailModal";
import EditCategoriesModal from "./EditCategoriesModal";
import EditMilestoneSummaryModal from "./EditMilestoneSummaryModal";
import { statusBadge } from "./statusUtils";
import FocusModeChrome from "./FocusModeChrome";

const FOCUS_MEDIA_QUERY = "(min-width: 1024px)";

const COPY_STATUS_COLORS: Record<string, string> = {
  "Copy - ready to start": "bg-sky-100 text-sky-700",
  "Copy - in progress": "bg-sky-100 text-sky-700",
  "Translation - ready to start": "bg-yellow-100 text-yellow-700",
  "Translation - in progress": "bg-yellow-100 text-yellow-700",
  "Translation - done": "bg-green-100 text-green-700",
};

function categoryLabel(key: string) {
  if (key === "done") return "Done";
  if (key === "indeterminate") return "In Progress";
  return "To Do";
}

function sizeOrder(size: string | null) {
  const order: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3, XL: 4 };
  return size ? (order[size] ?? 99) : 99;
}

export default function MissionPage() {
  const { missionKey } = useParams<{ missionKey: string }>();
  const navigate = useNavigate();

  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [detail, setDetail] = useState<MissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [hideDone, setHideDone] = useState(true);
  const [selectedStoryKey, setSelectedStoryKey] = useState<string | null>(null);
  const [editingCategories, setEditingCategories] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusSupported, setFocusSupported] = useState(() => window.matchMedia(FOCUS_MEDIA_QUERY).matches);
  const [milestoneSummaries, setMilestoneSummaries] = useState<Record<string, string>>({});
  const [editingSummaryFor, setEditingSummaryFor] = useState<string | null>(null);
  const detailRequestId = useRef(0);
  const validDetail = useRef<MissionDetail | null>(null);

  useAppChrome({ headerHidden: isFocusMode });

  useEffect(() => {
    const mediaQuery = window.matchMedia(FOCUS_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setFocusSupported(event.matches);
      if (!event.matches) setIsFocusMode(false);
    };

    setFocusSupported(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    api.missions
      .list()
      .then((data) => setMissions(data.missions))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = useCallback(async (key: string) => {
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    setError(null);
    const [detailResult, summariesResult] = await Promise.allSettled([
      api.missions.getDetail(key),
      api.missions.getMilestoneSummaries(key),
    ]);
    if (requestId !== detailRequestId.current) return;

    if (detailResult.status === "fulfilled") {
      validDetail.current = detailResult.value;
      setDetail(detailResult.value);
      setMilestoneSummaries(summariesResult.status === "fulfilled" ? summariesResult.value.summaries : {});
    } else {
      setError(detailResult.reason instanceof Error ? detailResult.reason.message : "Failed to load Mission details.");
      if (!validDetail.current) setIsFocusMode(false);
    }
    setDetailLoading(false);
  }, []);

  const refreshDetail = useCallback(async (key: string) => {
    const requestId = detailRequestId.current;
    const refreshedDetail = await api.missions.getDetail(key);
    if (requestId !== detailRequestId.current) throw new Error("Mission changed while refreshing.");
    validDetail.current = refreshedDetail;
    setDetail(refreshedDetail);
    return refreshedDetail;
  }, []);

  useEffect(() => {
    if (missionKey) {
      loadDetail(missionKey);
    } else {
      detailRequestId.current += 1;
      validDetail.current = null;
      setDetail(null);
      setDetailLoading(false);
      setIsFocusMode(false);
    }
  }, [missionKey, loadDetail]);

  // Keyboard shortcuts: R = refresh, D = toggle done visibility
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "r" || e.key === "R") {
        if (!selectedStoryKey && missionKey) loadDetail(missionKey);
      } else if (e.key === "d" || e.key === "D") {
        setHideDone((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [missionKey, loadDetail, selectedStoryKey]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    navigate(key ? `/missions/${key}` : "/missions", { replace: true });
  };

  // All non-rejected stories (for statistics)
  const allStories = detail?.stories ?? [];
  const stories = allStories.filter((s) => s.status !== "Rejected");
  const statusBreakdown = stories.reduce<Record<string, number>>((acc, s) => {
    const cat = categoryLabel(s.statusCategory);
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
  const sizeBreakdown = stories.reduce<Record<string, number>>((acc, s) => {
    const size = s.size ?? "Unestimated";
    acc[size] = (acc[size] ?? 0) + 1;
    return acc;
  }, {});
  const sortedSizes = Object.entries(sizeBreakdown).sort(
    ([a], [b]) => sizeOrder(a) - sizeOrder(b),
  );
  const hasCurrentDetail = detail?.epic.key === missionKey && !detailLoading;

  const viewControls = detail ? (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button onClick={() => setViewMode("list")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>List</button>
        <button onClick={() => setViewMode("map")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Story Map</button>
      </div>
      {hideDone && <span className="whitespace-nowrap rounded bg-yellow-100 px-1.5 py-0.5 text-[11px] text-yellow-700">Done hidden</span>}
    </div>
  ) : null;

  const workspace = detail && !detailLoading ? (
    <MilestoneWorkspace
      detail={detail}
      viewMode={viewMode}
      hideDone={hideDone}
      descriptions={milestoneSummaries}
      onStoryUpdated={() => refreshDetail(detail.epic.key)}
      onStorySelect={setSelectedStoryKey}
      onEditDescription={isFocusMode || !hasCurrentDetail ? undefined : setEditingSummaryFor}
    />
  ) : null;

  return (
    <div className={`min-h-screen bg-gray-50 ${isFocusMode ? "" : "px-6 py-6"}`}>
      {isFocusMode && detail && (
        <FocusModeChrome
          identity={<div className="flex min-w-0 items-center gap-2"><JiraLink issueKey={detail.epic.key} /><span className="truncate text-sm font-semibold text-gray-800">{detail.epic.shortName || detail.epic.summary}</span></div>}
          controls={viewControls}
          onExit={() => setIsFocusMode(false)}
        />
      )}

      {!isFocusMode && <>
      <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label htmlFor="mission-select" className="text-sm font-medium text-gray-700">
              Mission
            </label>
            <select
              id="mission-select"
              value={missionKey ?? ""}
              onChange={handleSelect}
              disabled={loading}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a mission…</option>
              {missions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.shortName || m.summary}
                </option>
              ))}
            </select>
          </div>
        {focusSupported && <div className="hidden lg:block">
          <button
            type="button"
            onClick={() => setIsFocusMode(true)}
            disabled={!hasCurrentDetail || !focusSupported}
            aria-keyshortcuts="Z"
            aria-describedby={!hasCurrentDetail ? "focus-mode-disabled-reason" : undefined}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>Enter Focus mode</span>
            <kbd aria-hidden="true" className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs">Z</kbd>
          </button>
          {!hasCurrentDetail && <p id="focus-mode-disabled-reason" className="mt-1 text-xs text-gray-500">Available after Mission details load.</p>}
        </div>}
      </div>
      </>}

      <main className={isFocusMode ? "px-6 py-6 pb-20" : ""}>
      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {detailLoading && (
        <p className="text-gray-500">Loading mission details…</p>
      )}

      {detail && !detailLoading && (
        <div className="space-y-6">
          {!isFocusMode && <>
          {/* Epic header */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <JiraLink issueKey={detail.epic.key} />
              {statusBadge(detail.epic.status)}
              <button
                onClick={() => setEditingCategories(true)}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
              >
                Edit categories
              </button>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">{detail.epic.summary}</h2>
            {detail.epic.shortName && (
              <p className="mt-1 text-sm text-gray-500">{detail.epic.shortName}</p>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Story count */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Stories</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stories.length}</p>
            </div>

            {/* Status breakdown */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-gray-500">Status</p>
              <div className="space-y-1">
                {["To Do", "In Progress", "Done"].map((cat) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{cat}</span>
                    <span className="font-medium">{statusBreakdown[cat] ?? 0}</span>
                  </div>
                ))}
              </div>
              {stories.length > 0 && (
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-100">
                  {(["Done", "In Progress", "To Do"] as const).map((cat) => {
                    const count = statusBreakdown[cat] ?? 0;
                    if (count === 0) return null;
                    const pct = (count / stories.length) * 100;
                    const colors: Record<string, string> = {
                      "Done": "bg-green-500",
                      "In Progress": "bg-orange-400",
                      "To Do": "bg-gray-300",
                    };
                    return (
                      <div
                        key={cat}
                        className={`${colors[cat]} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Size breakdown */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-gray-500">Size Distribution</p>
              <div className="space-y-1">
                {sortedSizes.map(([size, count]) => (
                  <div key={size} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{size}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>}
          {/* View toggle + content */}
          {!isFocusMode && <div className="flex items-center gap-4">
            {detail.epic.columns.length > 0 && (
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Story Map
                </button>
              </div>
            )}

            <span className="ml-auto flex items-center gap-3 text-[11px] text-gray-400">
              {hideDone && (
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">Done hidden</span>
              )}
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5">R</kbd> refresh
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5">D</kbd> toggle done
            </span>
          </div>}

          {workspace}
        </div>
      )}
      </main>

      {selectedStoryKey && (
        <StoryDetailModal
          storyKey={selectedStoryKey}
          hideDone={hideDone}
          onClose={() => setSelectedStoryKey(null)}
        />
      )}

      {editingCategories && detail && (
        <EditCategoriesModal
          epicKey={detail.epic.key}
          initialColumns={detail.epic.columns.map((c) => c.name)}
          onSave={async (columns) => {
            await api.missions.updateColumns(detail.epic.key, columns);
            loadDetail(missionKey!);
          }}
          onClose={() => setEditingCategories(false)}
        />
      )}

      {editingSummaryFor !== null && detail && (
        <EditMilestoneSummaryModal
          milestoneName={editingSummaryFor}
          currentSummary={milestoneSummaries[editingSummaryFor] ?? ""}
          onSave={async (summary) => {
            await api.missions.setMilestoneSummary(detail.epic.key, editingSummaryFor, summary);
            const data = await api.missions.getMilestoneSummaries(detail.epic.key);
            setMilestoneSummaries(data.summaries);
          }}
          onClose={() => setEditingSummaryFor(null)}
        />
      )}
    </div>
  );
}
