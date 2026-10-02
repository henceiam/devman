const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError((body as { error?: string }).error || `API error: ${res.status}`, res.status, body);
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

export interface JiraSearchIssue {
  key: string;
  fields: Record<string, unknown>;
}

export interface JiraSearchResponse {
  issues: JiraSearchIssue[];
  nextPageToken: string | null;
}

export interface CopyProgressIssue {
  key: string;
  summary: string;
  status: string;
  copyStatus: string | null;
  epicShortName: string | null;
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

export interface PullRequestContributor {
  login: string;
  avatarUrl: string | null;
}

export interface PullRequestWithReview {
  id: number;
  number: number;
  title: string;
  repo: string;
  jiraKey: string | null;
  jiraSummary: string | null;
  author: string;
  authorAvatar: string | null;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  htmlUrl: string;
  draft: boolean;
  ageDays: number;
  approved: boolean | null;
  released: boolean | null;
  releaseTag: string | null;
  releaseIsDraft: boolean;
  contributors: PullRequestContributor[];
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

export type WayfinderTicketType = "research" | "prototype" | "grilling" | "task" | null;

export interface WayfinderTicket {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  assignee: string;
  avatarUrl: string | null;
  type: WayfinderTicketType;
  blockedBy: string[];
  blocks: string[];
}

export interface WayfinderResponse {
  storyKey: string;
  tickets: WayfinderTicket[];
}

export interface StoryMapColumn {
  name: string;
  order: number;
}

export interface MissionSummary {
  key: string;
  summary: string;
  shortName: string;
  status: string;
  statusCategory: string;
  columns: StoryMapColumn[];
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
  labels: string[];
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
  latestActivity: string | null;
  labels: string[];
}

export interface CommentItem {
  id: string;
  author: string;
  avatarUrl: string | null;
  body: unknown | null;
  created: string;
  updated: string;
}

export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  [key: string]: unknown;
}

export interface AdfDocument extends AdfNode {
  type: "doc";
  version: 1;
  content: AdfNode[];
}

export interface IssueCopyData {
  status: string | null;
  translationKeys: AdfDocument | null;
  translationKeysState: "empty" | "initialized";
}

export interface TranslationKeyRow {
  key: string;
  referenceCopies: Array<{ header: string; value: string }>;
  comment: string;
  matchState: "matched" | "unmatched";
  locales: Array<
    | { locale: string; state: "found"; value: string }
    | { locale: string; state: "missing" }
  >;
}

export type TranslationKeysDetail =
  | { state: "empty" }
  | { state: "ready"; rows: TranslationKeyRow[] }
  | { state: "unstructured"; content: unknown };

export type InitializeTranslationKeysResponse =
  | { outcome: "initialized"; copy: IssueCopyData }
  | { outcome: "already-initialized"; copy: IssueCopyData };

export interface StoryDetailResponse {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  issuetype: string;
  description: unknown | null;
  acceptanceCriteria: unknown | null;
  implementationPlan: unknown | null;
  subtasks: SubtaskItem[];
  prState: PrState | null;
  labels: string[];
  copy: IssueCopyData;
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
  typeIconUrl: string | null;
  status: string;
  statusCategory: string;
  assignee: string;
  avatarUrl: string | null;
  milestone: string | null;
  size: string | null;
  prState: PrState | null;
  progress: { done: number; inProgress: number; total: number } | null;
  hideUntil: string | null;
  latestActivity: string | null;
  labels: string[];
}

export interface DiagnosticStep {
  name: string;
  status: "pass" | "fail" | "skip";
  detail: string;
}

export const api = {
  jira: {
    getProjects: () =>
      fetchJson<{ projects: JiraProject[] }>("/jira/projects"),
    getIssues: (project: string, maxResults = 50) =>
      fetchJson<{ issues: JiraIssue[] }>(
        `/jira/issues?project=${encodeURIComponent(project)}&maxResults=${maxResults}`,
      ),
    getCopyProgress: () =>
      fetchJson<{ issues: CopyProgressIssue[] }>("/jira/copy-progress"),
    runDiagnostics: () =>
      fetchJson<{ steps: DiagnosticStep[] }>("/jira/diagnostics"),
    search: async (params: {
      jql: string;
      maxResults?: number;
      fields?: string[];
    }): Promise<JiraSearchResponse> => {
      const res = await fetch(`${API_BASE}/jira/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError((body as { error?: string }).error || `API error: ${res.status}`, res.status, body);
      }
      return res.json();
    },
  },
  github: {
    getRepos: () =>
      fetchJson<{ repos: GitHubRepo[] }>("/github/repos"),
    getPulls: (owner: string, repo: string, state: "open" | "closed" | "all" = "open") =>
      fetchJson<{ pulls: GitHubPR[] }>(
        `/github/pulls?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&state=${state}`,
      ),
    getPullRequestsWithReviews: (params?: {
      repo?: string;
      author?: string;
      state?: "open" | "closed" | "all";
      sinceDays?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.repo) query.set("repo", params.repo);
      if (params?.author) query.set("author", params.author);
      if (params?.state) query.set("state", params.state);
      if (params?.sinceDays !== undefined) query.set("sinceDays", String(params.sinceDays));
      const qs = query.toString();
      return fetchJson<{ pulls: PullRequestWithReview[] }>(
        `/github/pull-requests${qs ? `?${qs}` : ""}`,
      );
    },
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
        throw new ApiError(body.error || `API error: ${res.status}`, res.status, body);
      }
      return res.json();
    },
    getStoryDetail: (storyKey: string) =>
      fetchJson<StoryDetailResponse>(`/missions/stories/${encodeURIComponent(storyKey)}`),
    getStoryGithub: (storyKey: string) =>
      fetchJson<StoryGitHubResponse>(`/missions/stories/${encodeURIComponent(storyKey)}/github`),
    getStoryWayfinder: (storyKey: string) =>
      fetchJson<WayfinderResponse>(`/missions/stories/${encodeURIComponent(storyKey)}/wayfinder`),
    getStoryComments: (storyKey: string) =>
      fetchJson<{ comments: CommentItem[] }>(`/missions/stories/${encodeURIComponent(storyKey)}/comments`),
    initializeTranslationKeys: async (issueKey: string): Promise<InitializeTranslationKeysResponse> => {
      const res = await fetch(
        `${API_BASE}/missions/issues/${encodeURIComponent(issueKey)}/copy/translation-keys/initialize`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError((body as { error?: string }).error || `API error: ${res.status}`, res.status, body);
      }
      return res.json();
    },
    getIssueTranslationKeys: (issueKey: string) =>
      fetchJson<TranslationKeysDetail>(
        `/missions/issues/${encodeURIComponent(issueKey)}/copy/translation-keys`,
      ),
    updateColumns: async (epicKey: string, columns: string[]): Promise<void> => {
      const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(epicKey)}/columns`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError((body as { error?: string }).error || `API error: ${res.status}`, res.status, body);
      }
    },
    getMilestoneSummaries: (epicKey: string) =>
      fetchJson<{ summaries: Record<string, string> }>(
        `/missions/${encodeURIComponent(epicKey)}/milestone-summaries`
      ),
    setMilestoneSummary: async (epicKey: string, milestoneName: string, summary: string): Promise<void> => {
      const res = await fetch(
        `${API_BASE}/missions/${encodeURIComponent(epicKey)}/milestone-summaries/${encodeURIComponent(milestoneName)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError((body as { error?: string }).error ?? res.statusText, res.status, body);
      }
    },
  },
  launchpad: {
    getEscalated: () =>
      fetchJson<{ tickets: EscalatedTicket[] }>("/launchpad/escalated"),
    getInProgress: () =>
      fetchJson<{ items: InProgressItem[] }>("/launchpad/in-progress"),
    hideIssue: async (key: string, hideUntil: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/launchpad/issues/${encodeURIComponent(key)}/hide`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideUntil }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError((body as { error?: string }).error || `API error: ${res.status}`, res.status, body);
      }
    },
  },
  devils: {
    getEscalated: () =>
      fetchJson<{ tickets: EscalatedTicket[] }>("/devils/escalated"),
    getInProgress: () =>
      fetchJson<{ items: InProgressItem[] }>("/devils/in-progress"),
    hideIssue: async (key: string, hideUntil: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/devils/issues/${encodeURIComponent(key)}/hide`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideUntil }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError((body as { error?: string }).error || `API error: ${res.status}`, res.status, body);
      }
    },
  },
};
