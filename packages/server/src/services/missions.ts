import { Version3Client } from "jira.js";
import { config } from "../config.js";
import { getPrWithReviews } from "./github.js";

let client: Version3Client | null = null;

function getClient(): Version3Client {
  if (!client) {
    if (!config.jira.host || !config.jira.email || !config.jira.apiToken) {
      throw new Error(
        "Jira configuration missing. Set JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN in .env",
      );
    }
    client = new Version3Client({
      host: config.jira.host,
      authentication: {
        basic: {
          email: config.jira.email,
          apiToken: config.jira.apiToken,
        },
      },
    });
  }
  return client;
}

export interface MissionSummary {
  key: string;
  summary: string;
  shortName: string;
  status: string;
  statusCategory: string;
  columns: StoryMapColumn[];
}

export interface StoryMapColumn {
  name: string;
  order: number;
}

export type PrState = "open" | "merged" | "declined" | "draft" | "unknown" | "branch";

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
  updated: string;
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
}

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

const MISSION_PROJECT = "EBBACKLOG";

export async function getMissions(): Promise<MissionSummary[]> {
  const jira = getClient();
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `project = "${MISSION_PROJECT}" AND issuetype = Epic AND labels = "mission" AND status NOT IN ("Closed", "Rejected") ORDER BY rank ASC`,
    maxResults: 100,
    fields: ["summary", "status", "customfield_10002", "customfield_11487"],
  });

  return (result.issues ?? []).map((issue) => {
    const fields = issue.fields as Record<string, unknown>;
    return {
      key: issue.key!,
      summary: issue.fields.summary,
      shortName: fields.customfield_10002 as string ?? "",
      status: issue.fields.status?.name ?? "Unknown",
      statusCategory: issue.fields.status?.statusCategory?.key ?? "new",
      columns: parseColumns(fields.customfield_11487 as string | null),
    };
  });
}

export async function getMissionDetail(epicKey: string): Promise<MissionDetail> {
  const jira = getClient();

  // Fetch the epic itself
  const epicResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key = "${epicKey}"`,
    maxResults: 1,
    fields: ["summary", "status", "customfield_10002", "customfield_11487"],
  });

  const epicIssue = epicResult.issues?.[0];
  if (!epicIssue) {
    throw new Error(`Mission not found: ${epicKey}`);
  }

  const epicFields = epicIssue.fields as Record<string, unknown>;
  const epic: MissionSummary = {
    key: epicIssue.key!,
    summary: epicIssue.fields.summary,
    shortName: epicFields.customfield_10002 as string ?? "",
    status: epicIssue.fields.status?.name ?? "Unknown",
    statusCategory: epicIssue.fields.status?.statusCategory?.key ?? "new",
    columns: parseColumns(epicFields.customfield_11487 as string | null),
  };

  // Fetch child stories — try "Epic Link" first, fall back to parent
  let stories: MissionStory[] = [];
  try {
    stories = await fetchStories(`"Epic Link" = ${epicKey}`);
  } catch {
    stories = await fetchStories(`parent = ${epicKey}`);
  }

  return { epic, stories };
}

async function fetchStories(jqlParentClause: string): Promise<MissionStory[]> {
  const jira = getClient();
  const PAGE_SIZE = 100;
  const allIssues: NonNullable<Awaited<ReturnType<typeof jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch>>["issues"]> = [];
  let startAt = 0;

  while (true) {
    const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
      jql: `${jqlParentClause} ORDER BY rank ASC`,
      maxResults: PAGE_SIZE,
      startAt,
      fields: [
        "summary", "status", "assignee", "issuetype", "subtasks",
        "customfield_11357", "customfield_11477", "customfield_11302", "customfield_11487",
        "customfield_10000", "updated", "labels",
      ],
    });
    const page = result.issues ?? [];
    allIssues.push(...page);
    if (page.length < PAGE_SIZE) break;
    startAt += PAGE_SIZE;
  }

  return allIssues.map((issue) => {
    const fields = issue.fields as Record<string, unknown>;
    const assignee = issue.fields.assignee as {
      displayName?: string;
      avatarUrls?: Record<string, string>;
    } | null;

    // Compute subtask progress
    const subtasks = (fields.subtasks ?? issue.fields.subtasks) as
      Array<{ fields: { status: { statusCategory: { key: string } } } }> | undefined;
    let subtaskProgress: MissionStory["subtaskProgress"] = null;
    if (subtasks && subtasks.length > 0) {
      let done = 0, inProgress = 0;
      for (const st of subtasks) {
        const cat = st.fields?.status?.statusCategory?.key;
        if (cat === "done") done++;
        else if (cat === "indeterminate") inProgress++;
      }
      subtaskProgress = { total: subtasks.length, done, inProgress };
    }

    return {
      key: issue.key!,
      summary: issue.fields.summary,
      status: issue.fields.status?.name ?? "Unknown",
      statusCategory: issue.fields.status?.statusCategory?.key ?? "new",
      assignee: assignee?.displayName ?? "Unassigned",
      avatarUrl: assignee?.avatarUrls?.["32x32"] ?? null,
      size: (fields.customfield_11357 as { value: string } | null)?.value ?? null,
      milestone: (fields.customfield_11477 as { value: string } | null)?.value ?? null,
      category: (fields.customfield_11487 as string | null) ?? null,
      copyStatus: (fields.customfield_11302 as { value: string } | null)?.value ?? null,
      type: issue.fields.issuetype?.name ?? "Story",
      subtaskProgress,
      prState: parsePrField(fields.customfield_10000 as string | null),
      updated: issue.fields.updated as string ?? "",
      labels: (fields.labels as string[] | null) ?? [],
    };
  });
}

/** Parse the Epic's customfield_11487 into column list.
 * Supports two formats:
 *   - Legacy Python-style dict: "{'category':{'Col1':1,'Col2':4,...}}"
 *   - New CSV format: "Col1;Col2;Col3" (order is positional)
 */
function parseColumns(raw: string | null): StoryMapColumn[] {
  if (!raw) return [];
  // If the value contains '{', assume legacy JSON/Python-dict format
  if (raw.includes("{")) {
    try {
      const jsonStr = raw.replace(/'/g, '"');
      const parsed = JSON.parse(jsonStr);
      const categoryMap = parsed.category as Record<string, number> | undefined;
      if (!categoryMap) return [];
      return Object.entries(categoryMap)
        .map(([name, order]) => ({ name, order }))
        .sort((a, b) => a.order - b.order);
    } catch {
      return [];
    }
  }
  // CSV format: split on semicolons, trim, filter empty
  return raw
    .split(";")
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((name, index) => ({ name, order: index + 1 }));
}

export async function getMilestoneSummaries(epicKey: string): Promise<Record<string, string>> {
  const jira = getClient();
  try {
    const result = await jira.issueProperties.getIssueProperty({
      issueIdOrKey: epicKey,
      propertyKey: "devman-milestone-summaries",
    });
    return (result.value as Record<string, string>) ?? {};
  } catch (err: any) {
    if (err?.status === 404 || err?.statusCode === 404) return {};
    throw err;
  }
}

export async function setMilestoneSummary(epicKey: string, milestoneName: string, summary: string): Promise<void> {
  const summaries = await getMilestoneSummaries(epicKey);
  if (summary === "") {
    delete summaries[milestoneName];
  } else {
    summaries[milestoneName] = summary;
  }
  const jira = getClient();
  await jira.issueProperties.setIssueProperty({
    issueIdOrKey: epicKey,
    propertyKey: "devman-milestone-summaries",
    propertyValue: summaries,
  });
}

export async function updateEpicColumns(epicKey: string, columns: string[]): Promise<void> {
  const trimmed = columns.map((c) => c.trim()).filter((c) => c.length > 0);
  const invalid = trimmed.filter((c) => c.includes(";"));
  if (invalid.length > 0) {
    throw new Error(`Category names cannot contain semicolons: ${invalid.join(", ")}`);
  }
  const jira = getClient();
  await jira.issues.editIssue({
    issueIdOrKey: epicKey,
    fields: { customfield_11487: trimmed.join(";") },
    notifyUsers: false,
  });
}

/** Parse Jira's customfield_10000 (dev info) to extract PR state or branch presence */
export function parsePrField(raw: string | null | undefined): PrState | null {
  if (!raw || typeof raw !== "string") return null;

  // Check for PRs first via stateCount in the embedded JSON
  const prStateMatch = raw.match(/"pullrequest"\s*:\s*\{[^}]*"stateCount"\s*:\s*(\d+)[^}]*"state"\s*:\s*"(\w+)"/);
  if (prStateMatch && parseInt(prStateMatch[1], 10) > 0) {
    const normalized = prStateMatch[2].toUpperCase();
    const map: Record<string, PrState> = {
      OPEN: "open",
      MERGED: "merged",
      DECLINED: "declined",
      DRAFT: "draft",
    };
    return map[normalized] ?? "unknown";
  }

  // Fallback: check top-level stateCount for PRs (older format)
  const topLevelPr = raw.match(/pullrequest=\{[^}]*stateCount=(\d+)/);
  if (topLevelPr && parseInt(topLevelPr[1], 10) > 0) {
    const stateMatch = raw.match(/"state"\s*:\s*"(\w+)"/);
    if (stateMatch) {
      const normalized = stateMatch[1].toUpperCase();
      const map: Record<string, PrState> = {
        OPEN: "open",
        MERGED: "merged",
        DECLINED: "declined",
        DRAFT: "draft",
      };
      return map[normalized] ?? "unknown";
    }
  }

  // Check for branches (no PR, but branch exists)
  const branchCountMatch = raw.match(/branch=\{[^}]*count=(\d+)/);
  if (branchCountMatch && parseInt(branchCountMatch[1], 10) > 0) {
    return "branch";
  }

  return null;
}

/** Update a story's milestone and/or category in Jira */
export async function updateStory(
  issueKey: string,
  update: { milestone?: string | null; category?: string | null },
): Promise<void> {
  const jira = getClient();
  const fields: Record<string, unknown> = {};

  if (update.milestone !== undefined) {
    fields.customfield_11477 = update.milestone
      ? { value: update.milestone }
      : null;
  }

  if (update.category !== undefined) {
    fields.customfield_11487 = update.category ?? null;
  }

  await jira.issues.editIssue({
    issueIdOrKey: issueKey,
    fields,
    notifyUsers: false,
  });
}

/** Fetch detailed info for a single story or epic (description, acceptance criteria, subtasks/child stories) */
export async function getStoryDetail(issueKey: string): Promise<StoryDetailResponse> {
  const jira = getClient();
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key = "${issueKey}"`,
    maxResults: 1,
    fields: ["summary", "status", "issuetype", "description", "subtasks", "customfield_11101", "customfield_10000", "customfield_11461"],
  });

  const issue = result.issues?.[0];
  if (!issue) throw new Error(`Story not found: ${issueKey}`);

  const fields = issue.fields as Record<string, unknown>;
  const issuetype = issue.fields.issuetype?.name ?? "Story";

  let subtasks: SubtaskItem[] = [];

  if (issuetype === "Epic") {
    // For epics, fetch child stories instead of subtasks
    let childStories: MissionStory[] = [];
    try {
      childStories = await fetchStories(`"Epic Link" = ${issueKey}`);
    } catch {
      childStories = await fetchStories(`parent = ${issueKey}`);
    }
    subtasks = childStories.map((s) => ({
      key: s.key,
      summary: s.summary,
      status: s.status,
      statusCategory: s.statusCategory,
      assignee: s.assignee,
      avatarUrl: s.avatarUrl,
      prState: s.prState,
      latestActivity: s.updated,
      labels: s.labels,
    }));
  } else {
    const subtasksRaw = (fields.subtasks ?? issue.fields.subtasks) as
      Array<{ key: string }> | undefined;
    const subtaskKeys = (subtasksRaw ?? []).map((st) => st.key);

    if (subtaskKeys.length > 0) {
      const keysJql = subtaskKeys.map((k) => `"${k}"`).join(", ");
      const subtaskResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
        jql: `key IN (${keysJql}) ORDER BY rank ASC`,
        maxResults: subtaskKeys.length,
        fields: ["summary", "status", "assignee", "customfield_10000", "updated", "labels"],
      });
      subtasks = (subtaskResult.issues ?? []).map((st) => {
        const assignee = st.fields.assignee as {
          displayName?: string;
          avatarUrls?: Record<string, string>;
        } | null;
        const stFields = st.fields as Record<string, unknown>;
        return {
          key: st.key!,
          summary: st.fields.summary,
          status: st.fields.status?.name ?? "Unknown",
          statusCategory: st.fields.status?.statusCategory?.key ?? "new",
          assignee: assignee?.displayName ?? "Unassigned",
          avatarUrl: assignee?.avatarUrls?.["32x32"] ?? null,
          prState: parsePrField(stFields.customfield_10000 as string | null),
          latestActivity: st.fields.updated as string ?? null,
          labels: (stFields.labels as string[] | null) ?? [],
        };
      });
    }
  }

  return {
    key: issue.key!,
    summary: issue.fields.summary,
    status: issue.fields.status?.name ?? "Unknown",
    statusCategory: issue.fields.status?.statusCategory?.key ?? "new",
    issuetype,
    description: issue.fields.description ?? null,
    acceptanceCriteria: (fields.customfield_11101 as unknown) ?? null,
    implementationPlan: (fields.customfield_11461 as unknown) ?? null,
    subtasks,
    prState: parsePrField(fields.customfield_10000 as string | null),
  };
}

/** Fetch comments for a story or epic */
export async function getStoryComments(issueKey: string): Promise<CommentItem[]> {
  const jira = getClient();
  const result = await jira.issueComments.getComments({
    issueIdOrKey: issueKey,
    maxResults: 100,
    orderBy: "created",
  });
  return (result.comments ?? []).map((c) => {
    const author = c.author as { displayName?: string; avatarUrls?: Record<string, string> } | undefined;
    return {
      id: c.id ?? "",
      author: author?.displayName ?? "Unknown",
      avatarUrl: author?.avatarUrls?.["32x32"] ?? null,
      body: c.body ?? null,
      created: c.created ?? "",
      updated: c.updated ?? "",
    };
  });
}

/** Parse a GitHub PR URL into owner, repo, and PR number */
function parseGitHubPrUrl(url: string): { owner: string; repo: string; number: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

/** Fetch GitHub PR details for a Jira issue using Jira dev-status API + GitHub API */
export async function getStoryGithub(issueKey: string): Promise<StoryGitHubResponse> {
  // Get numeric issue ID and customfield_10000 for hasBranch
  const jira = getClient();
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key = "${issueKey}"`,
    maxResults: 1,
    fields: ["customfield_10000"],
  });
  const issue = result.issues?.[0];
  if (!issue) throw new Error(`Story not found: ${issueKey}`);

  const issueId = issue.id!;
  const prFieldRaw = (issue.fields as Record<string, unknown>).customfield_10000 as string | null;
  // hasBranch is true only when there's a branch but no PR
  const hasBranch = parsePrField(prFieldRaw) === "branch";

  // Fetch dev-status PR data from Jira
  const auth = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString("base64");
  const devStatusUrl =
    `https://${config.jira.host.replace(/^https?:\/\//, "")}/rest/dev-status/latest/issue/detail` +
    `?issueId=${issueId}&applicationType=GitHub&dataType=pullrequest`;
  const devRes = await fetch(devStatusUrl, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  if (!devRes.ok) {
    return { prs: [], hasBranch };
  }

  const devData = (await devRes.json()) as {
    detail?: Array<{
      pullRequests?: Array<{
        id: string;
        name: string;
        url: string;
        status: string;
        lastUpdate: string;
        commentCount: number;
        repositoryName: string;
        source?: { branch: string };
        destination?: { branch: string };
        author?: { name: string; avatar: string };
        reviewers?: Array<{ name: string; avatar: string; approved: boolean }>;
      }>;
    }>;
  };

  const rawPrs = devData.detail?.flatMap((d) => d.pullRequests ?? []) ?? [];
  if (rawPrs.length === 0) {
    return { prs: [], hasBranch };
  }

  // Cap at 10 PRs to avoid rate limit issues
  const topPrs = rawPrs.slice(0, 10);

  // Fan out GitHub API calls in parallel
  const prDetails = await Promise.all(
    topPrs.map(async (rawPr): Promise<PrDetail | null> => {
      const parsed = parseGitHubPrUrl(rawPr.url);
      if (!parsed) return null;

      try {
        const { pr, reviews, requestedReviewers } = await getPrWithReviews(
          parsed.owner,
          parsed.repo,
          parsed.number,
        );

        // Deduplicate reviews: keep the latest state per reviewer
        const latestReviewByUser = new Map<number, (typeof reviews)[number]>();
        for (const review of reviews) {
          if (!review.user) continue;
          const existing = latestReviewByUser.get(review.user.id);
          if (!existing || new Date(review.submitted_at ?? 0) > new Date(existing.submitted_at ?? 0)) {
            latestReviewByUser.set(review.user.id, review);
          }
        }

        const reviewers: PrReviewer[] = [
          // Submitted reviews
          ...Array.from(latestReviewByUser.values()).map((r) => ({
            login: r.user?.login ?? "unknown",
            avatarUrl: r.user?.avatar_url ?? null,
            state: (r.state as PrReviewer["state"]) ?? "COMMENTED",
          })),
          // Pending requested reviewers (not yet reviewed)
          ...requestedReviewers
            .filter((u: { id: number; login: string; avatar_url: string }) => !latestReviewByUser.has(u.id))
            .map((u: { id: number; login: string; avatar_url: string }) => ({
              login: u.login,
              avatarUrl: u.avatar_url ?? null,
              state: "PENDING" as const,
            })),
        ];

        const jiraStatus = rawPr.status.toUpperCase();
        const stateMap: Record<string, PrState> = {
          OPEN: "open",
          MERGED: "merged",
          DECLINED: "declined",
          DRAFT: "draft",
        };
        const state: PrState = pr.draft ? "draft" : (stateMap[jiraStatus] ?? "unknown");

        return {
          number: parsed.number,
          title: pr.title,
          url: rawPr.url,
          state,
          draft: pr.draft ?? false,
          author: {
            login: pr.user?.login ?? "unknown",
            avatarUrl: pr.user?.avatar_url ?? null,
          },
          sourceBranch: pr.head.ref,
          targetBranch: pr.base.ref,
          openedAt: pr.created_at,
          updatedAt: pr.updated_at,
          mergedAt: pr.merged_at ?? null,
          closedAt: pr.closed_at ?? null,
          reviewers,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changed_files,
          labels: pr.labels.map((l: string | { name?: string }) => (typeof l === "string" ? l : l.name ?? "")),
          commentCount: rawPr.commentCount,
          repositoryName: rawPr.repositoryName,
        };
      } catch {
        // GitHub API unavailable or no access — fall back to Jira dev-status data
        const jiraStatus = rawPr.status.toUpperCase();
        const stateMap: Record<string, PrState> = {
          OPEN: "open",
          MERGED: "merged",
          DECLINED: "declined",
          DRAFT: "draft",
        };
        const state: PrState = stateMap[jiraStatus] ?? "unknown";
        const jiraReviewers: PrReviewer[] = (rawPr.reviewers ?? []).map((r) => ({
          login: r.name,
          avatarUrl: r.avatar ?? null,
          state: r.approved ? "APPROVED" : "PENDING",
        }));
        return {
          number: parsed.number,
          title: rawPr.name,
          url: rawPr.url,
          state,
          draft: state === "draft",
          author: {
            login: rawPr.author?.name ?? "unknown",
            avatarUrl: rawPr.author?.avatar ?? null,
          },
          sourceBranch: rawPr.source?.branch ?? "",
          targetBranch: rawPr.destination?.branch ?? "",
          openedAt: rawPr.lastUpdate,
          updatedAt: rawPr.lastUpdate,
          mergedAt: state === "merged" ? rawPr.lastUpdate : null,
          closedAt: state === "declined" ? rawPr.lastUpdate : null,
          reviewers: jiraReviewers,
          additions: 0,
          deletions: 0,
          changedFiles: 0,
          labels: [],
          commentCount: rawPr.commentCount,
          repositoryName: rawPr.repositoryName,
        };
      }
    }),
  );

  return {
    prs: prDetails.filter((p): p is PrDetail => p !== null),
    hasBranch,
  };
}
