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
  progress: { done: number; inProgress: number; total: number } | null;
}

export async function setHideUntilDate(issueKey: string, date: string): Promise<void> {
  const jira = getClient();
  await jira.issues.editIssue({
    issueIdOrKey: issueKey,
    fields: { customfield_11465: date } as Record<string, unknown>,
    notifyUsers: false,
  });
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
    jql: `project = "EBBACKLOG" AND issuetype not in (subTaskIssueTypes()) AND "Product teams[Checkboxes]" in (Radicals) AND status in ("In Progress", "Code review", "Ready for test", "In Test") ORDER BY status ASC, updated DESC`,
    maxResults: 200,
    fields: [
      "summary", "status", "issuetype", "assignee",
      "customfield_11357", "customfield_11477", "customfield_10000", "customfield_10014", "parent", "subtasks",
    ],
  });

  const issues = result.issues ?? [];
  console.log(`[launchpad] in-progress: Jira returned ${issues.length} issues`);
  if (issues.length > 0) {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const i of issues) {
      const t = i.fields.issuetype?.name ?? '?';
      const s = i.fields.status?.name ?? '?';
      byType[t] = (byType[t] ?? 0) + 1;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }
    console.log('[launchpad] in-progress: by type:', byType);
  // Diagnostic: try without product team filter
  const diagResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: 'project = "EBBACKLOG" AND issuetype not in (subTaskIssueTypes()) AND status in ("In Progress", "Code review", "Ready for test", "In Test") ORDER BY updated DESC',
    maxResults: 3,
    fields: ['summary', 'status', 'issuetype'],
  }).catch((e: unknown) => { console.log('[launchpad] diag query error:', e); return null; });
  console.log('[launchpad] diag (no team filter):', diagResult?.issues?.length ?? 'error', 'issues');
  if (diagResult?.issues?.length) {
    console.log('[launchpad] diag sample:', diagResult.issues[0].key, diagResult.issues[0].fields.status?.name);
  }
    console.log('[launchpad] in-progress: by status:', byStatus);
  }

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

  // Build story progress map for epics via a batch child-story query
  const epicKeyList = [...epicKeys];
  const epicProgressMap = new Map<string, { done: number; inProgress: number; total: number }>();
  if (epicKeyList.length > 0) {
    const keyList = epicKeyList.join(", ");
    try {
      // Run both queries in parallel — some projects use "parent" (next-gen), others use Epic Link (classic)
      const [parentResult, epicLinkResult] = await Promise.all([
        jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
          jql: `parent in (${keyList})`,
          maxResults: 100,
          fields: ["status", "parent"],
        }).catch(() => null),
        jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
          jql: `"Epic Link" in (${keyList})`,
          maxResults: 100,
          fields: ["status", "customfield_10014", "parent"],
        }).catch(() => null),
      ]);

      console.log(`[launchpad] parentResult: ${parentResult?.issues?.length ?? "null"} issues, epicLinkResult: ${epicLinkResult?.issues?.length ?? "null"} issues`);

      // Paginate if Jira returned a nextPageToken (cursor-based pagination)
      async function fetchAllPages(
        baseJql: string,
        baseFields: string[],
        firstPage: { issues?: unknown[]; nextPageToken?: string } | null,
      ): Promise<{ fields: Record<string, unknown>; key?: string }[]> {
        if (!firstPage) return [];
        const all = [...(firstPage.issues ?? [])] as { fields: Record<string, unknown>; key?: string }[];
        let nextPageToken = firstPage.nextPageToken;
        while (nextPageToken) {
          const page = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
            jql: baseJql,
            maxResults: 100,
            nextPageToken,
            fields: baseFields,
          }).catch(() => null);
          if (!page?.issues?.length) break;
          all.push(...(page.issues as { fields: Record<string, unknown>; key?: string }[]));
          nextPageToken = page.nextPageToken;
        }
        return all;
      }

      const [parentIssues, epicLinkIssues] = await Promise.all([
        fetchAllPages(`parent in (${keyList})`, ["status", "parent"], parentResult),
        fetchAllPages(`"Epic Link" in (${keyList})`, ["status", "customfield_10014", "parent"], epicLinkResult),
      ]);

      // Merge and deduplicate by issue key
      const seen = new Set<string>();
      const childIssues = [
        ...parentIssues,
        ...epicLinkIssues,
      ].filter((c) => {
        if (seen.has(c.key!)) return false;
        seen.add(c.key!);
        return true;
      });

      const perEpic: Record<string, number> = {};
      for (const child of childIssues) {
        const cf = child.fields;
        const epicLink = cf.customfield_10014;
        const parentObj = cf.parent as { key?: string } | null;
        const ownerKey =
          (typeof epicLink === "string" ? epicLink : null) ??
          (epicLink && typeof epicLink === "object" && "key" in epicLink ? (epicLink as { key: string }).key : null) ??
          parentObj?.key ?? null;
        if (ownerKey) perEpic[ownerKey] = (perEpic[ownerKey] ?? 0) + 1;
        if (!ownerKey || !epicKeys.has(ownerKey)) continue;
        const status = cf.status as { name?: string; statusCategory?: { key?: string } } | null;
        const statusName = status?.name ?? "";
        if (statusName === "Rejected") continue;
        const cat = status?.statusCategory?.key ?? "new";
        const prev = epicProgressMap.get(ownerKey) ?? { done: 0, inProgress: 0, total: 0 };
        epicProgressMap.set(ownerKey, {
          done: prev.done + (cat === "done" ? 1 : 0),
          inProgress: prev.inProgress + (cat === "indeterminate" ? 1 : 0),
          total: prev.total + 1,
        });
      }
      console.log(`[launchpad] epic progress: ${epicKeyList.length} epics, ${childIssues.length} children total. Per-epic child counts:`, perEpic);
    } catch {
      // Progress unavailable — not critical
    }
  }

  return issues
    // Filter out stories whose epic is already shown in the list
    .filter((issue) => {
      if (issue.fields.issuetype?.name === "Epic") return true;
      const epicKey = getEpicKey(issue);
      return !epicKey || !epicKeys.has(epicKey);
    })
    .map((issue) => {
    const fields = issue.fields as Record<string, unknown>;
    const assignee = issue.fields.assignee as {
      displayName?: string;
      avatarUrls?: Record<string, string>;
    } | null;

    // Compute progress
    let progress: { done: number; inProgress: number; total: number } | null = null;
    if (issue.fields.issuetype?.name === "Epic") {
      progress = epicProgressMap.get(issue.key!) ?? null;
    } else {
      // Story: use inline subtasks, excluding Rejected
      const subtasks = (fields.subtasks ?? issue.fields.subtasks) as
        Array<{ fields: { status: { name: string; statusCategory: { key: string } } } }> | undefined;
      if (subtasks && subtasks.length > 0) {
        const relevant = subtasks.filter((s) => s.fields?.status?.name !== "Rejected");
        const done = relevant.filter((s) => s.fields?.status?.statusCategory?.key === "done").length;
        const inProgress = relevant.filter((s) => s.fields?.status?.statusCategory?.key === "indeterminate").length;
        progress = { done, inProgress, total: relevant.length };
      }
    }

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
      progress,
    };
  });
}
