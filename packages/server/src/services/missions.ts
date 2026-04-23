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

const MISSION_PROJECT = "EBBACKLOG";

export async function getMissions(): Promise<MissionSummary[]> {
  const jira = getClient();
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `project = "${MISSION_PROJECT}" AND issuetype = Epic AND labels = "mission" ORDER BY rank ASC`,
    maxResults: 100,
    fields: ["summary", "status", "customfield_10002"],
  });

  return (result.issues ?? []).map((issue) => ({
    key: issue.key!,
    summary: issue.fields.summary,
    shortName: (issue.fields as Record<string, unknown>).customfield_10002 as string ?? "",
    status: issue.fields.status?.name ?? "Unknown",
    statusCategory: issue.fields.status?.statusCategory?.key ?? "new",
  }));
}

export async function getMissionDetail(epicKey: string): Promise<MissionDetail> {
  const jira = getClient();

  // Fetch the epic itself
  const epicResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key = "${epicKey}"`,
    maxResults: 1,
    fields: ["summary", "status", "customfield_10002"],
  });

  const epicIssue = epicResult.issues?.[0];
  if (!epicIssue) {
    throw new Error(`Mission not found: ${epicKey}`);
  }

  const epic: MissionSummary = {
    key: epicIssue.key!,
    summary: epicIssue.fields.summary,
    shortName: (epicIssue.fields as Record<string, unknown>).customfield_10002 as string ?? "",
    status: epicIssue.fields.status?.name ?? "Unknown",
    statusCategory: epicIssue.fields.status?.statusCategory?.key ?? "new",
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
      "customfield_11357", "customfield_11477", "customfield_11302",
    ],
  });

  return (result.issues ?? []).map((issue) => {
    const fields = issue.fields as Record<string, unknown>;
    return {
      key: issue.key!,
      summary: issue.fields.summary,
      status: issue.fields.status?.name ?? "Unknown",
      statusCategory: issue.fields.status?.statusCategory?.key ?? "new",
      assignee: issue.fields.assignee?.displayName ?? "Unassigned",
      size: (fields.customfield_11357 as { value: string } | null)?.value ?? null,
      milestone: (fields.customfield_11477 as { value: string } | null)?.value ?? null,
      copyStatus: (fields.customfield_11302 as { value: string } | null)?.value ?? null,
      type: issue.fields.issuetype?.name ?? "Story",
    };
  });
}
