import { useCallback, useEffect, useState } from "react";
import { api, type CopyProgressIssue } from "../api/client";
import JiraLink from "./JiraLink";

export default function CopyProgressPage() {
  const [issues, setIssues] = useState<CopyProgressIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.jira.getCopyProgress();
      setIssues(result.issues);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load copy and translation progress");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Copy &amp; Translations</h2>
          <p className="mt-1 text-sm text-gray-500">
            Jira issues labelled for copy or clinical copy, across the Radicals team.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-gray-500">
              Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load copy and translation progress: {error}
        </div>
      )}

      {loading && issues.length === 0 ? (
        <p role="status" className="text-sm text-gray-500">Loading copy and translation progress…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3">Issue</th>
                <th scope="col" className="px-4 py-3">Summary</th>
                <th scope="col" className="px-4 py-3">Jira status</th>
                <th scope="col" className="px-4 py-3">Copy &amp; Translations</th>
                <th scope="col" className="px-4 py-3">Epic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {issues.map((issue) => (
                <tr key={issue.key} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <JiraLink issueKey={issue.key} />
                  </td>
                  <td className="min-w-64 px-4 py-3 text-gray-800">{issue.summary}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{issue.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{issue.copyStatus ?? "Not set"}</td>
                  <td className="px-4 py-3 text-gray-700">{issue.epicShortName ?? "—"}</td>
                </tr>
              ))}
              {issues.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No matching Jira issues.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
