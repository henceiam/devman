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
      "customfield_11357", "customfield_11477", "customfield_10000", "customfield_10014", "parent",
    ],
  });

  const issues = result.issues ?? [];

  // Collect epic keys that are in the result
  const epicKeys = new Set(
    issues
      .filter((i) => i.fields.issuetype?.name === "Epic")
      .map((i) => i.key!)
  );

  /** Extract the parent epic key from a story, handling both classic (customfield_10014)
   *  and next-gen (parent field) project styles. */
  function getEpicKey(issue: (typeof issues)[number]): string | null {
    const fields = issue.fields as Record<string, unknown>;
    // Classic: Epic Link field — may be a string key or an object with a key property
    const epicLink = fields.customfield_10014;
    if (epicLink) {
      if (typeof epicLink === "string") return epicLink;
      if (typeof epicLink === "object" && epicLink !== null && "key" in epicLink) {
        return (epicLink as { key: string }).key;
      }
    }
    // Next-gen: parent field
    const parent = fields.parent;
    if (parent && typeof parent === "object" && parent !== null && "key" in parent) {
      const parentTyped = parent as { key: string; fields?: { issuetype?: { name?: string } } };
      // Only treat as epic parent if the parent is an Epic
      if (parentTyped.fields?.issuetype?.name === "Epic") {
        return parentTyped.key;
      }
    }
    return null;
  }

  return issues
    // Filter out stories whose epic is already shown in the list
    .filter((issue) => {
      if (issue.fields.issuetype?.name === "Epic") return true;
      const epicKey = getEpicKey(issue);
      // Temporary diagnostic log — remove once epic link field is confirmed
      const fields = issue.fields as Record<string, unknown>;
      console.log(`[launchpad] story ${issue.key} epicLink14=${JSON.stringify(fields.customfield_10014)} parent=${JSON.stringify(fields.parent)} → resolved epicKey=${epicKey} filtered=${!!epicKey && epicKeys.has(epicKey)}`);
      return !epicKey || !epicKeys.has(epicKey);
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
