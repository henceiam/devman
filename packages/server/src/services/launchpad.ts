import { Version3Client } from "jira.js";
import { config } from "../config.js";
import { parsePrField, type PrState } from "./missions.js";

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
}

export async function getLaunchpadEscalated(): Promise<EscalatedTicket[]> {
  const jira = getClient();

  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `project = "EBBACKLOG" AND labels = "issue-escalated-succesfully" AND "Product teams[Checkboxes]" in (Radicals) AND statusCategory != Done AND issuetype = "Support" ORDER BY priority ASC, updated DESC`,
    maxResults: 100,
    fields: [
      "summary", "status", "priority", "assignee",
      "created", "updated", "issuelinks", "customfield_10000",
    ],
  });

  return (result.issues ?? []).map((issue) => {
    const fields = issue.fields as Record<string, unknown>;
    const assignee = issue.fields.assignee as {
      displayName?: string;
      avatarUrls?: Record<string, string>;
    } | null;
    const priority = issue.fields.priority as {
      name?: string;
      iconUrl?: string;
    } | null;

    // Find the first linked SUPPORT project ticket
    const issueLinks = (fields.issuelinks ?? []) as Array<{
      type: { name: string };
      inwardIssue?: { key: string; fields: { summary: string; status: { name: string; statusCategory: { key: string } }; priority?: { name: string } } };
      outwardIssue?: { key: string; fields: { summary: string; status: { name: string; statusCategory: { key: string } }; priority?: { name: string } } };
    }>;

    let supportTicket: LinkedSupportTicket | null = null;
    for (const link of issueLinks) {
      const linked = link.inwardIssue ?? link.outwardIssue;
      if (linked && linked.key.startsWith("SUPPORT")) {
        supportTicket = {
          key: linked.key,
          summary: linked.fields.summary,
          status: linked.fields.status?.name ?? "Unknown",
          statusCategory: linked.fields.status?.statusCategory?.key ?? "new",
          priority: linked.fields.priority?.name ?? "Unknown",
        };
        break;
      }
    }

    return {
      key: issue.key!,
      summary: issue.fields.summary,
      status: issue.fields.status?.name ?? "Unknown",
      statusCategory: issue.fields.status?.statusCategory?.key ?? "new",
      priority: priority?.name ?? "Unknown",
      priorityIconUrl: priority?.iconUrl ?? null,
      assignee: assignee?.displayName ?? "Unassigned",
      avatarUrl: assignee?.avatarUrls?.["32x32"] ?? null,
      created: (fields.created as string) ?? "",
      updated: (fields.updated as string) ?? "",
      prState: parsePrField(fields.customfield_10000 as string | null),
      supportTicket,
    };
  });
}

export async function getLaunchpadInProgress(): Promise<InProgressItem[]> {
  const jira = getClient();

  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `project = "EBBACKLOG" AND issuetype in (Story, Epic) AND "Product teams[Checkboxes]" in (Radicals) AND status in ("In Progress", "Code review", "Ready for test") ORDER BY status ASC, updated DESC`,
    maxResults: 200,
    fields: [
      "summary", "status", "issuetype", "assignee",
      "customfield_11357", "customfield_11477", "customfield_10000", "customfield_10014",
    ],
  });

  const issues = result.issues ?? [];

  // Collect epic keys that are in the result
  const epicKeys = new Set(
    issues
      .filter((i) => i.fields.issuetype?.name === "Epic")
      .map((i) => i.key!)
  );

  return issues
    // Filter out stories whose epic link points to an epic already in the list
    .filter((issue) => {
      if (issue.fields.issuetype?.name === "Epic") return true;
      const epicLink = (issue.fields as Record<string, unknown>).customfield_10014 as string | null;
      return !epicLink || !epicKeys.has(epicLink);
    })
    .map((issue) => {
    const fields = issue.fields as Record<string, unknown>;
    const assignee = issue.fields.assignee as {
      displayName?: string;
      avatarUrls?: Record<string, string>;
    } | null;

    return {
      key: issue.key!,
      summary: issue.fields.summary,
      type: issue.fields.issuetype?.name ?? "Story",
      status: issue.fields.status?.name ?? "Unknown",
      statusCategory: issue.fields.status?.statusCategory?.key ?? "new",
      assignee: assignee?.displayName ?? "Unassigned",
      avatarUrl: assignee?.avatarUrls?.["32x32"] ?? null,
      size: (fields.customfield_11357 as { value: string } | null)?.value ?? null,
      milestone: (fields.customfield_11477 as { value: string } | null)?.value ?? null,
      prState: parsePrField(fields.customfield_10000 as string | null),
    };
  });
}
