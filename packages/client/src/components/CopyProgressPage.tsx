import { Fragment, useCallback, useEffect, useState } from "react";
import { api, type CopyProgressIssue, type TranslationKeysDetail } from "../api/client";
import JiraLink from "./JiraLink";

type TranslationKeysState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; detail: TranslationKeysDetail; selectedKey: string | null };

export default function CopyProgressPage() {
  const [issues, setIssues] = useState<CopyProgressIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(() => new Set());
  const [translationKeys, setTranslationKeys] = useState<Record<string, TranslationKeysState>>({});

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

  const loadTranslationKeys = async (issueKey: string) => {
    setTranslationKeys((current) => ({ ...current, [issueKey]: { status: "loading" } }));
    try {
      const detail = await api.missions.getIssueTranslationKeys(issueKey);
      setTranslationKeys((current) => ({
        ...current,
        [issueKey]: {
          status: "loaded",
          detail,
          selectedKey: detail.state === "ready" ? detail.rows[0]?.key ?? null : null,
        },
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
              {issues.map((issue) => {
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
                            onSelectKey={(selectedKey) => {
                              setTranslationKeys((current) => {
                                const existing = current[issue.key];
                                if (existing?.status !== "loaded") return current;
                                return {
                                  ...current,
                                  [issue.key]: { ...existing, selectedKey },
                                };
                              });
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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

function TranslationKeysExpansion({
  issueKey,
  state,
  onRetry,
  onSelectKey,
}: {
  issueKey: string;
  state: TranslationKeysState | undefined;
  onRetry: () => void;
  onSelectKey: (key: string) => void;
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

  const selectedRow = state.detail.rows.find((row) => row.key === state.selectedKey)
    ?? state.detail.rows[0];

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(12rem,0.35fr)_minmax(0,1fr)]">
      <nav aria-label={`Translation keys for ${issueKey}`} className="space-y-1">
        {state.detail.rows.map((row) => (
          <button
            key={row.key}
            type="button"
            aria-current={selectedRow?.key === row.key ? "true" : undefined}
            onClick={() => onSelectKey(row.key)}
            className={`block w-full rounded-md px-3 py-2 text-left font-mono text-sm ${
              selectedRow?.key === row.key
                ? "bg-blue-100 text-blue-900"
                : "text-gray-700 hover:bg-white"
            }`}
          >
            {row.key}
          </button>
        ))}
      </nav>
      {selectedRow && (
        <section aria-label={`Details for ${selectedRow.key}`} className="min-w-0 space-y-4">
          <div>
            <h3 className="font-mono text-sm font-semibold text-gray-900">{selectedRow.key}</h3>
            {selectedRow.comment && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{selectedRow.comment}</p>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Reference copy</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedRow.referenceCopies.map((copy, index) => (
                <article
                  key={`${copy.header}-${index}`}
                  className="rounded-md border border-gray-200 bg-white p-3"
                >
                  <h5 className="text-xs font-semibold text-gray-700">{copy.header}</h5>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{copy.value || "Missing value"}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
