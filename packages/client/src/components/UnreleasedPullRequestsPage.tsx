import { useEffect, useState } from "react";
import { api, type PullRequestWithReview, type GitHubRepo } from "../api/client";
import JiraLink from "./JiraLink";

function formatTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "<1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

export default function UnreleasedPullRequestsPage() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [pulls, setPulls] = useState<PullRequestWithReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoFilter, setRepoFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");

  const DEFAULT_REPO = "DoctrinAB/flow";
  const authors = [...new Set(pulls.map((p) => p.author))].sort();
  const groupedPulls = pulls.reduce<Record<string, PullRequestWithReview[]>>((groups, pr) => {
    const key = pr.jiraKey ?? "__NO_JIRA__";
    if (!groups[key]) groups[key] = [];
    groups[key].push(pr);
    return groups;
  }, {});
  const groupedEntries = Object.entries(groupedPulls).sort(([a], [b]) => {
    if (a === "__NO_JIRA__") return 1;
    if (b === "__NO_JIRA__") return -1;
    return a.localeCompare(b);
  });

  useEffect(() => {
    api.github
      .getRepos()
      .then((data) => {
        setRepos(data.repos);
        if (data.repos.some((r) => r.fullName === DEFAULT_REPO)) {
          setRepoFilter((current) => current || DEFAULT_REPO);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!repoFilter) {
      setPulls([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    api.github
      .getPullRequestsWithReviews({
        state: "closed",
        repo: repoFilter,
        author: authorFilter || undefined,
      })
      .then((data) => setPulls(data.pulls.filter((pr) => pr.released === false)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoFilter, authorFilter]);

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Repo</label>
          <select
            value={repoFilter}
            onChange={(e) => {
              setRepoFilter(e.target.value);
              setAuthorFilter("");
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a repo…</option>
            {repos.map((r) => (
              <option key={r.fullName} value={r.fullName}>
                {r.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Author</label>
          <select
            value={authorFilter}
            disabled={!repoFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All Authors</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!repoFilter && (
        <div className="py-12 text-center text-gray-400">
          Select a repo to view unreleased pull requests.
        </div>
      )}

      {repoFilter && error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {repoFilter && loading && <p className="text-gray-500">Loading unreleased pull requests…</p>}

      {repoFilter && !loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">PR</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">People</th>
                <th className="px-4 py-3">Merged</th>
                <th className="px-4 py-3">Approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupedEntries.flatMap(([groupKey, groupItems]) => [
                <tr key={`group-${groupKey}`} className="bg-gray-50">
                  <td colSpan={5} className="px-4 py-2 text-xs font-medium text-gray-600">
                    {groupKey === "__NO_JIRA__" ? (
                      <>No Jira ticket · {groupItems.length} PR{groupItems.length === 1 ? "" : "s"}</>
                    ) : (
                      <>
                        <JiraLink issueKey={groupKey} className="text-sm">
                          {groupKey} — {groupItems[0]?.jiraSummary ?? "Summary unavailable"}
                        </JiraLink>{" "}
                        · {groupItems.length} PR{groupItems.length === 1 ? "" : "s"}
                      </>
                    )}
                  </td>
                </tr>,
                ...groupItems
                  .sort((a, b) => {
                    const aTime = a.mergedAt ? new Date(a.mergedAt).getTime() : 0;
                    const bTime = b.mergedAt ? new Date(b.mergedAt).getTime() : 0;
                    return bTime - aTime;
                  })
                  .map((pr) => (
                    <tr key={pr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">#{pr.number}</td>
                      <td className="px-4 py-3">
                        <a
                          href={pr.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {pr.title}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="flex items-center"
                          title={`Author: ${pr.author}${pr.contributors.length ? ` · ${pr.contributors.map((c) => c.login).join(", ")}` : ""}`}
                        >
                          {pr.authorAvatar ? (
                            <img
                              src={pr.authorAvatar}
                              alt={pr.author}
                              title={pr.author}
                              className="h-7 w-7 rounded-full"
                            />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
                              {pr.author.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span className="ml-0.5 flex -space-x-1">
                            {pr.contributors.slice(0, 4).map((c) =>
                              c.avatarUrl ? (
                                <img
                                  key={c.login}
                                  src={c.avatarUrl}
                                  alt={c.login}
                                  title={c.login}
                                  className="h-5 w-5 rounded-full ring-1 ring-white"
                                />
                              ) : (
                                <span
                                  key={c.login}
                                  title={c.login}
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[8px] font-medium text-gray-600 ring-1 ring-white"
                                >
                                  {c.login.slice(0, 2).toUpperCase()}
                                </span>
                              ),
                            )}
                            {pr.contributors.length > 4 && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[8px] text-gray-500 ring-1 ring-white">
                                +{pr.contributors.length - 4}
                              </span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-600" title={pr.mergedAt ?? ""}>
                        {pr.mergedAt ? `${formatTimeAgo(pr.mergedAt)} ago` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {pr.approved === true ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            ✓ Approved
                          </span>
                        ) : pr.approved === false ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-600">
                            ⏳ Pending
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )),
              ])}
              {pulls.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No unreleased pull requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
