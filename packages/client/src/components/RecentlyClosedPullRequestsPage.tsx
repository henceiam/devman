import { useEffect, useState } from "react";
import { api, type PullRequestWithReview, type GitHubRepo } from "../api/client";
import { PrAgeBullet } from "./PrAgeBullet";

export default function RecentlyClosedPullRequestsPage() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [pulls, setPulls] = useState<PullRequestWithReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoFilter, setRepoFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");

  const DEFAULT_REPO = "DoctrinAB/flow";
  const authors = [...new Set(pulls.map((p) => p.author))].sort();

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
        sinceDays: 7,
        repo: repoFilter,
        author: authorFilter || undefined,
      })
      .then((data) => setPulls(data.pulls))
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
          Select a repo to view recently closed pull requests.
        </div>
      )}

      {repoFilter && error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {repoFilter && loading && <p className="text-gray-500">Loading recently closed pull requests…</p>}

      {repoFilter && !loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">PR</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">People</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3">Released</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pulls.map((pr) => (
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
                  <td className="px-4 py-3">
                    <PrAgeBullet createdAt={pr.createdAt} updatedAt={pr.updatedAt} />
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
                  <td className="px-4 py-3">
                    {pr.released === true ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          pr.releaseIsDraft
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                        title={
                          pr.releaseIsDraft
                            ? `${pr.releaseTag ?? "—"} (draft — not yet published)`
                            : pr.releaseTag ?? "Released"
                        }
                      >
                        {pr.releaseIsDraft ? "⚡ Draft" : "✓ Released"}
                      </span>
                    ) : pr.released === false ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        ✗ Unreleased
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {pulls.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No PRs closed in the last week.
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
