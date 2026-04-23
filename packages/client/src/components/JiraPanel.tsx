import { useEffect, useState } from "react";
import { api, type JiraProject, type JiraIssue } from "../api/client";

export default function JiraPanel() {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [issueTotal, setIssueTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.jira
      .getProjects()
      .then((data) => setProjects(data.projects))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setIssues([]);
      return;
    }
    setLoading(true);
    api.jira
      .getIssues(selectedProject)
      .then((data) => {
        setIssues(data.issues);
        setIssueTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-blue-700">Jira Projects</h2>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading && !projects.length ? (
        <p className="text-gray-500">Loading projects…</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {projects.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelectedProject(p.key === selectedProject ? null : p.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  selectedProject === p.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p.key} — {p.name}
              </button>
            ))}
          </div>

          {selectedProject && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                Issues in {selectedProject} ({issueTotal} total)
              </h3>
              {loading ? (
                <p className="text-gray-500">Loading issues…</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {issues.map((issue) => (
                    <li key={issue.key} className="flex items-center gap-3 py-2 text-sm">
                      <span className="font-mono text-xs text-gray-400">{issue.key}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          issue.status === "Done"
                            ? "bg-green-100 text-green-700"
                            : issue.status === "In Progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {issue.status}
                      </span>
                      <span className="truncate">{issue.summary}</span>
                      <span className="ml-auto text-xs text-gray-400">{issue.assignee}</span>
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
