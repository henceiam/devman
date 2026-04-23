import { useEffect, useState } from "react";
import { api, type GitHubRepo, type GitHubPR } from "../api/client";

export default function GitHubPanel() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [pulls, setPulls] = useState<GitHubPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.github
      .getRepos()
      .then((data) => setRepos(data.repos))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRepo) {
      setPulls([]);
      return;
    }
    setLoading(true);
    const [owner, repo] = selectedRepo.fullName.split("/");
    api.github
      .getPulls(owner, repo)
      .then((data) => setPulls(data.pulls))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedRepo]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">GitHub Repos</h2>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading && !repos.length ? (
        <p className="text-gray-500">Loading repos…</p>
      ) : (
        <>
          <ul className="mb-4 max-h-64 divide-y divide-gray-100 overflow-y-auto">
            {repos.map((r) => (
              <li
                key={r.id}
                onClick={() => setSelectedRepo(r.fullName === selectedRepo?.fullName ? null : r)}
                className={`cursor-pointer px-3 py-2 text-sm transition ${
                  selectedRepo?.fullName === r.fullName
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.fullName}</span>
                  <span className="flex items-center gap-2 text-xs">
                    {r.language && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                        {r.language}
                      </span>
                    )}
                    {r.private && (
                      <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">
                        private
                      </span>
                    )}
                  </span>
                </div>
                {r.description && (
                  <p className="mt-0.5 truncate text-xs text-gray-400">{r.description}</p>
                )}
              </li>
            ))}
          </ul>

          {selectedRepo && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                Open PRs — {selectedRepo.fullName}
              </h3>
              {loading ? (
                <p className="text-gray-500">Loading pull requests…</p>
              ) : pulls.length === 0 ? (
                <p className="text-sm text-gray-400">No open pull requests</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {pulls.map((pr) => (
                    <li key={pr.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="font-mono text-xs text-gray-400">#{pr.number}</span>
                      <a
                        href={pr.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-blue-600 hover:underline"
                      >
                        {pr.title}
                      </a>
                      {pr.draft && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                          draft
                        </span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">{pr.user}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
