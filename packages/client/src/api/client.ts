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
  columns: { name: string; order: number }[];
}

export type PrState = "open" | "merged" | "declined" | "draft" | "unknown" | "branch";

export interface PrReviewer {
  login: string;
  avatarUrl: string | null;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING";
}

export interface PrDetail {
  number: number;
  title: string;
  url: string;
  state: PrState;
  draft: boolean;
  author: { login: string; avatarUrl: string | null };
  sourceBranch: string;
  targetBranch: string;
  openedAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  reviewers: PrReviewer[];
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  commentCount: number;
  repositoryName: string;
}

export interface StoryGitHubResponse {
  prs: PrDetail[];
  hasBranch: boolean;
}

export interface MissionStory {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  assignee: string;
  avatarUrl: string | null;
  size: string | null;
  milestone: string | null;
  category: string | null;
  copyStatus: string | null;
  type: string;
  subtaskProgress: { total: number; done: number; inProgress: number } | null;
  prState: PrState | null;
}

export interface MissionDetail {
  epic: MissionSummary;
  stories: MissionStory[];
}

export interface SubtaskItem {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  assignee: string;
  avatarUrl: string | null;
  prState: PrState | null;
}

export interface StoryDetailResponse {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  issuetype: string;
  description: unknown | null;
  acceptanceCriteria: unknown | null;
  subtasks: SubtaskItem[];
  prState: PrState | null;
}

export interface LinkedSupportTicket {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  priority: string;
}

export interface EscalatedTicket {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  priority: string;
  priorityIconUrl: string | null;
  assignee: string;
  avatarUrl: string | null;
  created: string;
  updated: string;
  prState: PrState | null;
  supportTicket: LinkedSupportTicket | null;
}

export interface InProgressItem {
  key: string;
  summary: string;
  type: string;
  status: string;
  statusCategory: string;
  assignee: string;
  avatarUrl: string | null;
  milestone: string | null;
  size: string | null;
  prState: PrState | null;
  progress: { done: number; inProgress: number; total: number } | null;
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
    updateStory: async (storyKey: string, update: { milestone?: string | null; category?: string | null }) => {
      const res = await fetch(`${API_BASE}/missions/stories/${encodeURIComponent(storyKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API error: ${res.status}`);
      }
      return res.json();
    },
    getStoryDetail: (storyKey: string) =>
      fetchJson<StoryDetailResponse>(`/missions/stories/${encodeURIComponent(storyKey)}`),
    getStoryGithub: (storyKey: string) =>
      fetchJson<StoryGitHubResponse>(`/missions/stories/${encodeURIComponent(storyKey)}/github`),
  },
  launchpad: {
    getEscalated: () =>
      fetchJson<{ tickets: EscalatedTicket[] }>("/launchpad/escalated"),
    getInProgress: () =>
      fetchJson<{ items: InProgressItem[] }>("/launchpad/in-progress"),
  },
};
