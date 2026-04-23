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

export interface MissionSummary {
  key: string;
  summary: string;
  shortName: string;
  status: string;
  statusCategory: string;
}

export interface MissionStory {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  assignee: string;
  size: string | null;
  milestone: string | null;
  copyStatus: string | null;
  type: string;
}

export interface MissionDetail {
  epic: MissionSummary;
  stories: MissionStory[];
}

export const api = {
  jira: {
    getProjects: () =>
      fetchJson<{ projects: JiraProject[] }>("/jira/projects"),
    getIssues: (project: string, maxResults = 50) =>
      fetchJson<{ issues: JiraIssue[] }>(
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
  missions: {
    list: () =>
      fetchJson<{ missions: MissionSummary[] }>("/missions"),
    getDetail: (key: string) =>
      fetchJson<MissionDetail>(`/missions/${encodeURIComponent(key)}`),
  },
};
