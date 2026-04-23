const API_BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  priority: string;
  type: string;
  updated: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  updatedAt: string;
  openIssuesCount: number;
  htmlUrl: string;
  private: boolean;
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  state: string;
  user: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  draft: boolean;
}

export const api = {
  jira: {
    getProjects: () =>
      fetchJson<{ projects: JiraProject[] }>("/jira/projects"),
    getIssues: (project: string, maxResults = 50) =>
      fetchJson<{ total: number; issues: JiraIssue[] }>(
        `/jira/issues?project=${encodeURIComponent(project)}&maxResults=${maxResults}`,
      ),
  },
  github: {
    getRepos: () =>
      fetchJson<{ repos: GitHubRepo[] }>("/github/repos"),
    getPulls: (owner: string, repo: string, state: "open" | "closed" | "all" = "open") =>
      fetchJson<{ pulls: GitHubPR[] }>(
        `/github/pulls?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&state=${state}`,
      ),
  },
};
