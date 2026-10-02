import { Fragment, useCallback, useEffect, useState } from "react";
import {
  api,
  type CopyProgressIssue,
  type TranslationKeysDetail,
} from "../api/client";
import JiraLink from "./JiraLink";
import TranslationKeyList from "./TranslationKeyList";

const TRANSLATION_DONE = "Translation - done";

type TranslationKeysState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; detail: TranslationKeysDetail };

export default function CopyProgressPage() {
  const [issues, setIssues] = useState<CopyProgressIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(() => new Set());
  const [translationKeys, setTranslationKeys] = useState<Record<string, TranslationKeysState>>({});
  const [hideDone, setHideDone] = useState(false);

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

  // Keyboard shortcuts: R = refresh, H = toggle hiding "Translation - done" issues
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target;
      if (target instanceof Element && target.closest("input, select, textarea, [contenteditable='true']")) return;
      if (e.key === "r" || e.key === "R") void refresh();
      else if (e.key === "h" || e.key === "H") setHideDone((prev) => !prev);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [refresh]);

  const doneCount = issues.filter((issue) => issue.copyStatus === TRANSLATION_DONE).length;
  const visibleIssues = hideDone ? issues.filter((issue) => issue.copyStatus !== TRANSLATION_DONE) : issues;

  const loadTranslationKeys = async (issueKey: string) => {
    setTranslationKeys((current) => ({ ...current, [issueKey]: { status: "loading" } }));
    try {
      const detail = await api.missions.getIssueTranslationKeys(issueKey);
      setTranslationKeys((current) => ({
        ...current,
        [issueKey]: { status: "loaded", detail },
      }));
    } catch (err) {
      setTranslationKeys((current) => ({
        ...current,
        [issueKey]: {
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load translation keys",
        },
      }));
    }
  };

  const toggleIssue = (issueKey: string) => {
    if (expandedIssues.has(issueKey)) {
      setExpandedIssues((current) => {
        const next = new Set(current);
        next.delete(issueKey);
        return next;
      });
      return;
    }

    setExpandedIssues((current) => new Set(current).add(issueKey));
    if (!translationKeys[issueKey]) void loadTranslationKeys(issueKey);
  };

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
          <span className="flex items-center gap-3 text-[11px] text-gray-400">
            {hideDone && doneCount > 0 && (
              <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">
                {doneCount} translation done hidden
              </span>
            )}
            <span><kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5">R</kbd> refresh</span>
            <span><kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5">H</kbd> {hideDone ? "show" : "hide"} done</span>
          </span>
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
              {visibleIssues.map((issue) => {
                const isExpanded = expandedIssues.has(issue.key);
                const keyState = translationKeys[issue.key];
                return (
                  <Fragment key={issue.key}>
                    <tr className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <JiraLink issueKey={issue.key} />
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? "Hide" : "Show"} translation keys for ${issue.key}`}
                            onClick={() => toggleIssue(issue.key)}
                            className="rounded px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          >
                            {isExpanded ? "−" : "+"}
                          </button>
                        </div>
                      </td>
                      <td className="min-w-64 px-4 py-3 text-gray-800">{issue.summary}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{issue.status}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{issue.copyStatus ?? "Not set"}</td>
                      <td className="px-4 py-3 text-gray-700">{issue.epicShortName ?? "—"}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50 px-4 py-5">
                          <TranslationKeysExpansion
                            issueKey={issue.key}
                            state={keyState}
                            onRetry={() => void loadTranslationKeys(issue.key)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {visibleIssues.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    {issues.length === 0 ? "No matching Jira issues." : "All matching issues are Translation - done (press H to show)."}
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

function TranslationKeysExpansion({
  issueKey,
  state,
  onRetry,
}: {
  issueKey: string;
  state: TranslationKeysState | undefined;
  onRetry: () => void;
}) {
  if (!state || state.status === "loading") {
    return <p role="status" className="text-sm text-gray-500">Loading translation keys for {issueKey}…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center gap-3">
        <p role="alert" className="text-sm text-red-700">
          Failed to load translation keys for {issueKey}: {state.message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.detail.state === "empty") {
    return <p role="status" className="text-sm text-gray-600">No translation keys in Jira</p>;
  }

  if (state.detail.state === "unstructured") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Jira translation keys content is not a usable table.</p>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs">
          {JSON.stringify(state.detail.content, null, 2) ?? "Unable to display Jira content"}
        </pre>
      </div>
    );
  }

  return <TranslationKeyList issueKey={issueKey} rows={state.detail.rows} />;
}
