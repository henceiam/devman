import { Version3Client } from "jira.js";
import { config } from "../config.js";

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
}

export interface MissionDetail {
  epic: MissionSummary;
  stories: MissionStory[];
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
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `${jqlParentClause} ORDER BY rank ASC`,
    maxResults: 200,
    fields: [
      "summary", "status", "assignee", "issuetype",
      "customfield_11357", "customfield_11477", "customfield_11302", "customfield_11487",
    ],
  });

  return (result.issues ?? []).map((issue) => {
    const fields = issue.fields as Record<string, unknown>;
    const assignee = issue.fields.assignee as {
      displayName?: string;
      avatarUrls?: Record<string, string>;
    } | null;
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
    };
  });
}

/** Parse the Epic's customfield_11487 Python-style dict into column list */
function parseColumns(raw: string | null): StoryMapColumn[] {
  if (!raw) return [];
  try {
    // Format: "{'category':{'Col1':1,'Col2':4,...}}"
    // Convert Python-style single quotes to JSON double quotes
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
