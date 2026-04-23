import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { api, type MissionSummary, type MissionStory, type MissionDetail } from "../api/client";

const STATUS_COLORS: Record<string, string> = {
  "Request": "bg-white text-gray-600 border border-gray-200",
  "To do": "bg-white text-gray-600 border border-gray-200",
  "To Refine": "bg-blue-100 text-blue-700",
  "In Design": "bg-purple-100 text-purple-700",
  "Ready for Design": "bg-purple-100 text-purple-700",
  "READY FOR DEVELOPMENT": "bg-blue-200 text-blue-800",
  "To Investigate": "bg-blue-200 text-blue-800",
  "In Progress": "bg-orange-100 text-orange-700",
  "Under investigation": "bg-orange-100 text-orange-700",
  "On Hold": "bg-orange-100 text-orange-700",
  "Code review": "bg-yellow-100 text-yellow-700",
  "Ready for test": "bg-yellow-100 text-yellow-700",
  "In Test": "bg-yellow-100 text-yellow-700",
  "Waiting for support": "bg-yellow-100 text-yellow-700",
  "Waiting for customer": "bg-yellow-100 text-yellow-700",
  "Ready for Deploy": "bg-lime-100 text-lime-700",
  "Closed": "bg-green-100 text-green-700",
  "Rejected": "bg-gray-200 text-gray-500",
};

const COPY_STATUS_COLORS: Record<string, string> = {
  "Copy - ready to start": "bg-sky-100 text-sky-700",
  "Copy - in progress": "bg-sky-100 text-sky-700",
  "Translation - ready to start": "bg-yellow-100 text-yellow-700",
  "Translation - in progress": "bg-yellow-100 text-yellow-700",
  "Translation - done": "bg-green-100 text-green-700",
};

function statusBadge(status: string) {
  const cls = STATUS_COLORS[status] ?? "bg-red-100 text-red-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

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

  useEffect(() => {
    api.missions
      .list()
      .then((data) => setMissions(data.missions))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = useCallback((key: string) => {
    setDetailLoading(true);
    setError(null);
    api.missions
      .getDetail(key)
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setDetailLoading(false));
  }, []);

  useEffect(() => {
    if (missionKey) {
      loadDetail(missionKey);
    } else {
      setDetail(null);
    }
  }, [missionKey, loadDetail]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    navigate(key ? `/missions/${key}` : "/missions", { replace: true });
  };

  // Compute breakdowns
  const stories = detail?.stories ?? [];
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

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center gap-4">
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
              {m.shortName ? `${m.shortName} — ` : ""}{m.summary} ({m.key})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {detailLoading && (
        <p className="text-gray-500">Loading mission details…</p>
      )}

      {detail && !detailLoading && (
        <div className="space-y-6">
          {/* Epic header */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-gray-400">{detail.epic.key}</span>
              {statusBadge(detail.epic.status)}
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

          {/* Story list */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-3">
              <h3 className="text-sm font-medium text-gray-700">Stories</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {stories.map((story) => (
                <li key={story.key} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <span className="w-28 shrink-0 font-mono text-xs text-gray-400">{story.key}</span>
                  {statusBadge(story.status)}
                  <span className="min-w-0 flex-1 truncate">{story.summary}</span>
                  {story.size && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {story.size}
                    </span>
                  )}
                  {story.milestone && (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-600">
                      {story.milestone}
                    </span>
                  )}
                  {story.copyStatus && (
                    <span className={`rounded px-1.5 py-0.5 text-xs ${COPY_STATUS_COLORS[story.copyStatus] ?? "bg-gray-100 text-gray-600"}`}>
                      {story.copyStatus}
                    </span>
                  )}
                  <span className="w-28 shrink-0 text-right text-xs text-gray-400">{story.assignee}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
