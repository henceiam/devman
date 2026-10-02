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

export async function setHideUntilDate(issueKey: string, date: string): Promise<void> {
  const jira = getClient();
  await jira.issues.editIssue({
    issueIdOrKey: issueKey,
    fields: { customfield_11465: date || null } as Record<string, unknown>,
    notifyUsers: false,
  });
}

export async function getLaunchpadEscalated(team: string): Promise<EscalatedTicket[]> {
  const jira = getClient();

  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `project = "EBBACKLOG" AND labels = "issue-escalated-succesfully" AND "Product teams[Checkboxes]" in (${team}) AND statusCategory != Done AND issuetype = "Support" ORDER BY priority ASC, updated DESC`,
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

export async function getLaunchpadInProgress(team: string): Promise<InProgressItem[]> {
  const jira = getClient();

  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `project = "EBBACKLOG" AND issuetype not in (subTaskIssueTypes()) AND "Product teams[Checkboxes]" in (${team}) AND status in ("In Progress", "Code review", "Ready for test", "In Test") ORDER BY status ASC, updated DESC`,
    maxResults: 200,
    fields: ["*all"],
  });

  const issues = result.issues ?? [];
  console.log(`[${team}] in-progress: Jira returned ${issues.length} issues`);
  if (issues.length > 0) {
    console.log(`[${team}] DIAG field keys on first issue:`, Object.keys(issues[0].fields as Record<string, unknown>).filter(k => k.startsWith("customfield_")).sort());
    const allFields = issues[0].fields as Record<string, unknown>;
    for (const [k, v] of Object.entries(allFields)) {
      if (k.startsWith("customfield_") && v !== null && v !== undefined && !Array.isArray(v)) {
        const str = JSON.stringify(v).slice(0, 120);
        if (/radicals|devils|team/i.test(str)) {
          console.log(`[${team}] DIAG possible teams field: ${k} =`, str);
        }
      }
      if (k.startsWith("customfield_") && Array.isArray(v) && (v as unknown[]).length > 0) {
        const str = JSON.stringify(v).slice(0, 120);
        if (/radicals|devils|team/i.test(str)) {
          console.log(`[${team}] DIAG possible teams field (array): ${k} =`, str);
        }
      }
    }
  }
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

  // ── Mission filtering ────────────────────────────────────────────────────
  // Build the set of epic keys that carry the "mission" label. Start with the
  // epics already in the result, then fetch labels for any referenced parent
  // epic that isn't in the result (those can still be missions).
  const missionEpicKeys = new Set(
    issues
      .filter((i) => i.fields.issuetype?.name === "Epic")
      .filter((i) => ((i.fields as Record<string, unknown>).labels as string[] | null ?? []).includes("mission"))
      .map((i) => i.key!)
  );
  const referencedEpicKeys = new Set(
    issues
      .filter((i) => i.fields.issuetype?.name !== "Epic")
      .map((i) => getEpicKey(i))
      .filter((k): k is string => k !== null)
  );
  const unfetchedEpicKeys = [...referencedEpicKeys].filter(
    (k) => !epicKeys.has(k) && !missionEpicKeys.has(k)
  );
  if (unfetchedEpicKeys.length > 0) {
    try {
      const epicLabelResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
        jql: `issue in (${unfetchedEpicKeys.join(", ")})`,
        maxResults: Math.min(unfetchedEpicKeys.length, 200),
        fields: ["labels"],
      });
      for (const epic of epicLabelResult.issues ?? []) {
        const labels = ((epic.fields as Record<string, unknown>).labels as string[] | null) ?? [];
        if (labels.includes("mission")) {
          missionEpicKeys.add(epic.key!);
        }
      }
    } catch {
      // Mission filtering on parent epics is best-effort
    }
  }

  // Build story progress map for epics via a batch child-story query
  const epicKeyList = [...epicKeys];
  const epicProgressMap = new Map<string, { done: number; inProgress: number; total: number }>();
  const epicLatestMap = new Map<string, string>();
  if (epicKeyList.length > 0) {
    const keyList = epicKeyList.join(", ");
    try {
      // Run both queries in parallel — some projects use "parent" (next-gen), others use Epic Link (classic)
      const [parentResult, epicLinkResult] = await Promise.all([
        jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
          jql: `parent in (${keyList})`,
          maxResults: 100,
          fields: ["status", "parent", "updated"],
        }).catch(() => null),
        jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
          jql: `"Epic Link" in (${keyList})`,
          maxResults: 100,
          fields: ["status", "customfield_10014", "parent", "updated"],
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
        fetchAllPages(`parent in (${keyList})`, ["status", "parent", "updated"], parentResult),
        fetchAllPages(`"Epic Link" in (${keyList})`, ["status", "customfield_10014", "parent", "updated"], epicLinkResult),
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

      // Latest activity per epic = max child updated
      for (const child of childIssues) {
        const cf = child.fields;
        const epicLink = cf.customfield_10014;
        const parentObj = cf.parent as { key?: string } | null;
        const ownerKey =
          (typeof epicLink === "string" ? epicLink : null) ??
          (epicLink && typeof epicLink === "object" && "key" in epicLink ? (epicLink as { key: string }).key : null) ??
          parentObj?.key ?? null;
        if (!ownerKey || !epicKeys.has(ownerKey)) continue;
        const updated = cf.updated as string | undefined;
        if (updated) {
          const current = epicLatestMap.get(ownerKey);
          if (!current || updated > current) {
            epicLatestMap.set(ownerKey, updated);
          }
        }
      }

      console.log(`[launchpad] epic progress: ${epicKeyList.length} epics, ${childIssues.length} children total. Per-epic child counts:`, perEpic);
    } catch {
      // Progress unavailable — not critical
    }
  }

  // ── Subtask latest-activity: batch-query subtask updated dates ──────────
  const subtaskLatestMap = new Map<string, string>();
  const subtaskKeys: string[] = [];
  const parentBySubtaskKey = new Map<string, string>();
  for (const issue of issues) {
    if (issue.fields.issuetype?.name === "Epic") continue;
    const rawSubtasks = (issue.fields.subtasks ?? []) as Array<{ key?: string }>;
    if (rawSubtasks.length === 0) continue;
    for (const st of rawSubtasks) {
      if (st.key) {
        subtaskKeys.push(st.key);
        parentBySubtaskKey.set(st.key, issue.key!);
      }
    }
  }
  if (subtaskKeys.length > 0) {
    try {
      const subtaskResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
        jql: `issue in (${subtaskKeys.join(", ")})`,
        maxResults: Math.min(subtaskKeys.length, 200),
        fields: ["updated"],
      });
      for (const st of subtaskResult.issues ?? []) {
        const parentKey = parentBySubtaskKey.get(st.key!);
        if (!parentKey) continue;
        const updated = (st.fields as Record<string, unknown>).updated as string | undefined;
        if (!updated) continue;
        const current = subtaskLatestMap.get(parentKey);
        if (!current || updated > current) {
          subtaskLatestMap.set(parentKey, updated);
        }
      }
    } catch {
      // Subtask dates not critical
    }
  }

  return issues
    // Filter out missions: the issue itself has the "mission" label, or its
    // parent epic does.
    .filter((issue) => {
      const labels = (issue.fields as Record<string, unknown>).labels as string[] | null;
      if (labels?.includes("mission")) return false;
      if (issue.fields.issuetype?.name === "Epic") return true;
      const epicKey = getEpicKey(issue);
      if (epicKey && missionEpicKeys.has(epicKey)) return false;
      return true;
    })
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

    const ownUpdated = fields.updated as string | undefined ?? null;
    const latestActivity =
      issue.fields.issuetype?.name === "Epic"
        ? epicLatestMap.get(issue.key!) ?? ownUpdated
        : subtaskLatestMap.get(issue.key!) ?? ownUpdated;

    return {
      key: issue.key!,
      summary: issue.fields.summary,
      type: issue.fields.issuetype?.name ?? "Story",
      typeIconUrl: issue.fields.issuetype?.iconUrl ?? null,
      status: issue.fields.status?.name ?? "Unknown",
      statusCategory: issue.fields.status?.statusCategory?.key ?? "new",
      assignee: assignee?.displayName ?? "Unassigned",
      avatarUrl: assignee?.avatarUrls?.["32x32"] ?? null,
      size: (fields.customfield_11357 as { value: string } | null)?.value ?? null,
      milestone: (fields.customfield_11477 as { value: string } | null)?.value ?? null,
      prState: parsePrField(fields.customfield_10000 as string | null),
      progress,
      hideUntil: (fields.customfield_11465 as string | null) ?? null,
      labels: (fields.labels as string[] | null) ?? [],
      latestActivity,
    };
  });
}
