import { Version3Client } from "jira.js";
import { config } from "../config.js";
import { getPrWithReviews } from "./github.js";
import { getTranslationKeyValues, type TranslationLocaleValue } from "./translations.js";

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
  locales: TranslationLocaleValue[];
}

interface ParsedTranslationKeyRow {
  key: string;
  referenceCopies: Array<{ header: string; value: string }>;
  comment: string;
}

type ParsedTranslationKeysTable =
  | { state: "empty" }
  | { state: "ready"; rows: ParsedTranslationKeyRow[] }
  | { state: "unstructured"; content: unknown };

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allIssues: any[] = [];
  let startAt = 0;

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch as any)({
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
    fields: ["summary", "status", "issuetype", "description", "subtasks", "customfield_11101", "customfield_10000", "customfield_11461", "labels", "customfield_11302", "customfield_11285"],
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
    labels: (fields.labels as string[] | null) ?? [],
    copy: buildIssueCopyData(fields),
  };
}

/** Build IssueCopyData from a Jira issue's raw fields (customfield_11302 + customfield_11285). */
function buildIssueCopyData(fields: Record<string, unknown>): IssueCopyData {
  const status = (fields.customfield_11302 as { value: string } | null)?.value ?? null;
  const raw = fields.customfield_11285;
  const translationKeys = isValidAdfDocument(raw) && hasMeaningfulAdfContent(raw.content) ? raw : null;
  return {
    status,
    translationKeys,
    translationKeysState: translationKeys ? "initialized" : "empty",
  };
}

export async function getIssueTranslationKeys(issueKey: string): Promise<TranslationKeysDetail> {
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(issueKey)) throw new InvalidIssueKeyError();
  const jira = getClient();
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key = "${issueKey}"`,
    maxResults: 1,
    fields: ["customfield_11285"],
  });
  const issue = result.issues?.[0];
  if (!issue) throw new IssueNotFoundError(issueKey);
  const detail = parseTranslationKeysTable((issue.fields as Record<string, unknown>).customfield_11285);
  if (detail.state !== "ready") return detail;

  const translationValues = await getTranslationKeyValues(detail.rows.map((row) => row.key));
  return {
    state: "ready",
    rows: detail.rows.map((row, index) => ({ ...row, ...translationValues[index] })),
  };
}

export function parseTranslationKeysTable(raw: unknown): ParsedTranslationKeysTable {
  if (raw === null || raw === undefined) return { state: "empty" };
  if (!isValidAdfDocument(raw)) return { state: "unstructured", content: raw };
  if (!hasMeaningfulAdfContent(raw.content)) return { state: "empty" };

  const tables = raw.content.filter((node) => node.type === "table");
  if (tables.length !== 1) return { state: "unstructured", content: raw };

  const rows = tables[0].content ?? [];
  if (rows.length === 0) return { state: "empty" };
  if (rows.some((row) => row.type !== "tableRow")) {
    return { state: "unstructured", content: raw };
  }
  const headerCells = rows[0]?.content;
  if (!headerCells?.length) return { state: "unstructured", content: raw };

  const headers = headerCells.map((node) => adfCellText(node));
  const keyIndex = headers.findIndex((header) => header.trim().toLowerCase() === "key");
  const commentIndex = headers.findIndex((header) => header.trim().toLowerCase() === "comment");
  if (keyIndex < 0 || commentIndex < 0 || headers.some((header) => !header.trim())) {
    return { state: "unstructured", content: raw };
  }

  const referenceCopyIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ index }) => index !== keyIndex && index !== commentIndex);
  const parsedRows: ParsedTranslationKeyRow[] = [];
  for (const dataRow of rows.slice(1)) {
    const cells = dataRow.content ?? [];
    if (cells.length === 0 || cells.every((cell) => !adfCellText(cell).trim())) continue;
    if (cells.length !== headers.length) return { state: "unstructured", content: raw };
    const key = adfCellText(cells[keyIndex]);
    if (!key.trim()) return { state: "unstructured", content: raw };
    parsedRows.push({
      key,
      referenceCopies: referenceCopyIndexes.map(({ header, index }) => ({
        header,
        value: adfCellText(cells[index]),
      })),
      comment: adfCellText(cells[commentIndex]),
    });
  }

  return parsedRows.length > 0
    ? { state: "ready", rows: parsedRows }
    : { state: "empty" };
}

function adfCellText(node: AdfNode): string {
  const textFrom = (current: AdfNode): string => {
    if (typeof current.text === "string") return current.text;
    if (current.type === "hardBreak") return "\n";
    const childText = (current.content ?? []).map(textFrom);
    return childText.join("");
  };
  return (node.content ?? []).map(textFrom).join("\n");
}

/** Validate only the ADF invariants DevMan relies on: a `doc` root, `version` 1, array `content`. */
function isValidAdfDocument(raw: unknown): raw is AdfDocument {
  if (!raw || typeof raw !== "object") return false;
  const doc = raw as Record<string, unknown>;
  return doc.type === "doc" && doc.version === 1 && Array.isArray(doc.content);
}

/** "Structurally contentless" = empty content array, or only `paragraph`/`doc` containers
 * with no meaningful descendants. EVERY other node type is meaningful — including tables
 * (even with all-blank cells) and non-text leaf nodes like `inlineCard`, `mention`, or
 * `mediaSingle` — so a doc containing only such nodes counts as initialized and is never
 * overwritten by initialize. (Allowlist of contentless types, not a denylist.) */
export function hasMeaningfulAdfContent(content: AdfNode[]): boolean {
  return content.some(nodeHasMeaningfulContent);
}

function nodeHasMeaningfulContent(node: AdfNode): boolean {
  if (typeof node.text === "string") return node.text.length > 0;
  if (node.type === "paragraph" || node.type === "doc") {
    return Array.isArray(node.content) && hasMeaningfulAdfContent(node.content);
  }
  return true;
}

// "Blocks" link type is admin-editable per Jira instance; this id was confirmed live
// against the real instance (GET /rest/api/3/issueLinkType) rather than assumed.
const WAYFINDER_BLOCKS_LINK_TYPE_ID = "10000";
const WAYFINDER_TICKET_TYPES = ["research", "prototype", "grilling", "task"] as const;

function parseWayfinderTicketType(labels: string[]): WayfinderTicketType {
  for (const type of WAYFINDER_TICKET_TYPES) {
    // Accept both the legacy "wayfinder:type" and the newer "wayfinder-type" spellings.
    if (labels.includes(`wayfinder:${type}`) || labels.includes(`wayfinder-${type}`)) return type;
  }
  return null;
}

/** Fetch a Story's Subtasks as Wayfinder tickets: type, status, assignee, and intra-Story dependency edges. */
export async function getStoryWayfinder(issueKey: string): Promise<WayfinderResponse> {
  const jira = getClient();
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key = "${issueKey}"`,
    maxResults: 1,
    fields: ["subtasks"],
  });

  const issue = result.issues?.[0];
  if (!issue) throw new Error(`Story not found: ${issueKey}`);

  const fields = issue.fields as Record<string, unknown>;
  const subtasksRaw = (fields.subtasks ?? []) as Array<{ key: string }>;
  const subtaskKeys = subtasksRaw.map((st) => st.key);

  if (subtaskKeys.length === 0) {
    return { storyKey: issueKey, tickets: [] };
  }

  const subtaskKeySet = new Set(subtaskKeys);
  const keysJql = subtaskKeys.map((k) => `"${k}"`).join(", ");
  const subtaskResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key IN (${keysJql}) ORDER BY rank ASC`,
    maxResults: subtaskKeys.length,
    fields: ["summary", "status", "assignee", "labels", "issuelinks"],
  });

  const tickets: WayfinderTicket[] = (subtaskResult.issues ?? []).map((st) => {
    const assignee = st.fields.assignee as {
      displayName?: string;
      avatarUrls?: Record<string, string>;
    } | null;
    const stFields = st.fields as Record<string, unknown>;
    const labels = (stFields.labels as string[] | null) ?? [];

    const issueLinks = (stFields.issuelinks ?? []) as Array<{
      type: { id?: string; name?: string };
      inwardIssue?: { key: string };
      outwardIssue?: { key: string };
    }>;

    const blockedBy: string[] = [];
    const blocks: string[] = [];
    for (const link of issueLinks) {
      const isBlocksLink = link.type?.id === WAYFINDER_BLOCKS_LINK_TYPE_ID || link.type?.name === "Blocks";
      if (!isBlocksLink) continue;
      if (link.inwardIssue && subtaskKeySet.has(link.inwardIssue.key)) {
        blockedBy.push(link.inwardIssue.key);
      }
      if (link.outwardIssue && subtaskKeySet.has(link.outwardIssue.key)) {
        blocks.push(link.outwardIssue.key);
      }
    }

    return {
      key: st.key!,
      summary: st.fields.summary,
      status: st.fields.status?.name ?? "Unknown",
      statusCategory: st.fields.status?.statusCategory?.key ?? "new",
      assignee: assignee?.displayName ?? "Unassigned",
      avatarUrl: assignee?.avatarUrls?.["32x32"] ?? null,
      type: parseWayfinderTicketType(labels),
      blockedBy,
      blocks,
    };
  });

  return { storyKey: issueKey, tickets };
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

// ---- Copy tab: Translation keys initialization ----

export class IssueNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  constructor(issueKey: string) {
    super(`Issue not found: ${issueKey}`);
    this.name = "IssueNotFoundError";
  }
}

export class InvalidIssueKeyError extends Error {
  constructor() {
    super("Invalid Jira issue key");
    this.name = "InvalidIssueKeyError";
  }
}

export class CopyIneligibleError extends Error {
  readonly code = "INELIGIBLE" as const;
  constructor(issueKey: string) {
    super(
      `Issue ${issueKey} is not eligible for translation keys initialization ` +
        `(must be in project ${MISSION_PROJECT} and carry the label "copy" or "copy-clinical")`,
    );
    this.name = "CopyIneligibleError";
  }
}

export class TranslationKeysUpstreamError extends Error {
  readonly code = "UPSTREAM" as const;
  constructor(issueKey: string) {
    super(`Jira did not store the translation keys template for ${issueKey}`);
    this.name = "TranslationKeysUpstreamError";
  }
}

// Canonical Translation keys template derived from EBBACKLOG-25185
// (.scratch/copy-tab/research/reference-table-and-field-schema.md), reproduced
// exactly including all Jira-generated localId values.
const TRANSLATION_KEYS_TEMPLATE: AdfDocument = {
  type: "doc",
  version: 1,
  content: [
    {
      type: "table",
      attrs: {
        isNumberColumnEnabled: false,
        layout: "align-start",
        localId: "46a8212e-4198-49ea-b8ab-dcdccc1d44ae",
      },
      content: [
        {
          type: "tableRow",
          attrs: {
            localId: "a5f10b88e85a",
          },
          content: [
            {
              type: "tableHeader",
              attrs: {
                localId: "f523629022e3",
              },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Key",
                      marks: [
                        {
                          type: "strong",
                        },
                      ],
                    },
                  ],
                  attrs: {
                    localId: "27be9aa11183",
                  },
                },
              ],
            },
            {
              type: "tableHeader",
              attrs: {
                localId: "f9f715caeab5",
              },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Copy",
                      marks: [
                        {
                          type: "strong",
                        },
                      ],
                    },
                  ],
                  attrs: {
                    localId: "e1e0b474cbbd",
                  },
                },
              ],
            },
            {
              type: "tableHeader",
              attrs: {
                localId: "4b4e00466479",
              },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Comment",
                      marks: [
                        {
                          type: "strong",
                        },
                      ],
                    },
                  ],
                  attrs: {
                    localId: "90ee91169cf2",
                  },
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          attrs: {
            localId: "0f1dc4ec63c4",
          },
          content: [
            {
              type: "tableCell",
              attrs: {
                localId: "0bb5a1f4b9ca",
              },
              content: [
                {
                  type: "paragraph",
                  attrs: {
                    localId: "7c085926c93f",
                  },
                },
              ],
            },
            {
              type: "tableCell",
              attrs: {
                localId: "05a629f416d2",
              },
              content: [
                {
                  type: "paragraph",
                  attrs: {
                    localId: "5783200410c9",
                  },
                },
              ],
            },
            {
              type: "tableCell",
              attrs: {
                localId: "f99690030059",
              },
              content: [
                {
                  type: "paragraph",
                  attrs: {
                    localId: "a9dabd6477d6",
                  },
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          attrs: {
            localId: "505928dcccfb",
          },
          content: [
            {
              type: "tableCell",
              attrs: {
                localId: "a8b1b2429c09",
              },
              content: [
                {
                  type: "paragraph",
                  attrs: {
                    localId: "c9e0aebfa61a",
                  },
                },
              ],
            },
            {
              type: "tableCell",
              attrs: {
                localId: "58a4dcfcf55f",
              },
              content: [
                {
                  type: "paragraph",
                  attrs: {
                    localId: "48f778b3b47b",
                  },
                },
              ],
            },
            {
              type: "tableCell",
              attrs: {
                localId: "5f987016a2a7",
              },
              content: [
                {
                  type: "paragraph",
                  attrs: {
                    localId: "9ccad3a80185",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const COPY_ELIGIBLE_LABELS = ["copy", "copy-clinical"];

/** Initialize the Translation keys field (customfield_11285) with the canonical
 * Key/Copy/Comment table. The server enforces project and label eligibility
 * independently of the client, and never overwrites existing content. */
export async function initializeTranslationKeys(
  issueKey: string,
): Promise<InitializeTranslationKeysResponse> {
  const jira = getClient();

  const readCopyFields = async () => {
    const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
      jql: `key = "${issueKey}"`,
      maxResults: 1,
      fields: ["labels", "project", "customfield_11302", "customfield_11285"],
    });
    const issue = result.issues?.[0];
    if (!issue) throw new IssueNotFoundError(issueKey);
    return issue.fields as Record<string, unknown>;
  };

  const fields = await readCopyFields();

  const projectKey = (fields.project as { key?: string } | null)?.key;
  const labels = (fields.labels as string[] | null) ?? [];
  if (projectKey !== MISSION_PROJECT || !COPY_ELIGIBLE_LABELS.some((l) => labels.includes(l))) {
    throw new CopyIneligibleError(issueKey);
  }

  const currentCopy = buildIssueCopyData(fields);
  if (currentCopy.translationKeysState === "initialized") {
    return { outcome: "already-initialized", copy: currentCopy };
  }

  await jira.issues.editIssue({
    issueIdOrKey: issueKey,
    fields: { customfield_11285: TRANSLATION_KEYS_TEMPLATE },
    notifyUsers: false,
  });

  const updatedCopy = buildIssueCopyData(await readCopyFields());
  if (updatedCopy.translationKeysState !== "initialized") {
    throw new TranslationKeysUpstreamError(issueKey);
  }

  return { outcome: "initialized", copy: updatedCopy };
}
