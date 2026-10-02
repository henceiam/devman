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

export async function getProjects() {
  const jira = getClient();
  const result = await jira.projects.searchProjects();
  return (result.values ?? []).map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    projectTypeKey: p.projectTypeKey,
  }));
}

export interface IssueGrouping {
  groupKey: string;
  groupSummary: string | null;
  issueSummary: string | null;
}

export async function getIssueGroupingByKeys(issueKeys: string[]): Promise<Record<string, IssueGrouping>> {
  const uniqueKeys = [...new Set(issueKeys.map((key) => key.toUpperCase()))];
  if (uniqueKeys.length === 0) {
    return {};
  }

  const jira = getClient();
  const jqlKeys = uniqueKeys.map((key) => `"${key}"`).join(", ");
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key in (${jqlKeys})`,
    maxResults: uniqueKeys.length,
    fields: ["summary", "parent", "issuetype"],
  });

  const groupings: Record<string, IssueGrouping> = {};
  const missingParentSummaryKeys = new Set<string>();

  for (const issue of result.issues ?? []) {
    const issueKey = issue.key?.toUpperCase();
    if (!issueKey) continue;

    const summary = typeof issue.fields.summary === "string" && issue.fields.summary.length > 0
      ? issue.fields.summary
      : null;

    const fields = issue.fields as Record<string, unknown>;
    const issueType = fields.issuetype as { subtask?: boolean } | undefined;
    const parent = fields.parent as { key?: string; fields?: { summary?: string } } | undefined;
    const parentKey = parent?.key?.toUpperCase() ?? null;
    const parentSummary = typeof parent?.fields?.summary === "string" && parent.fields.summary.length > 0
      ? parent.fields.summary
      : null;

    if (issueType?.subtask === true && parentKey) {
      groupings[issueKey] = {
        groupKey: parentKey,
        groupSummary: parentSummary,
        issueSummary: summary,
      };
      if (!parentSummary) {
        missingParentSummaryKeys.add(parentKey);
      }
      continue;
    }

    groupings[issueKey] = {
      groupKey: issueKey,
      groupSummary: summary,
      issueSummary: summary,
    };
  }

  if (missingParentSummaryKeys.size === 0) {
    return groupings;
  }

  const parentKeys = [...missingParentSummaryKeys];
  const parentJql = parentKeys.map((key) => `"${key}"`).join(", ");
  const parentResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key in (${parentJql})`,
    maxResults: parentKeys.length,
    fields: ["summary"],
  });

  const parentSummaries: Record<string, string> = {};
  for (const parentIssue of parentResult.issues ?? []) {
    const key = parentIssue.key?.toUpperCase();
    const summary = parentIssue.fields.summary;
    if (key && typeof summary === "string" && summary.length > 0) {
      parentSummaries[key] = summary;
    }
  }

  for (const grouping of Object.values(groupings)) {
    if (grouping.groupSummary === null && grouping.groupKey !== "") {
      grouping.groupSummary = parentSummaries[grouping.groupKey] ?? grouping.issueSummary;
    }
  }

  return groupings;
}

export interface DiagnosticStep {
  name: string;
  status: "pass" | "fail" | "skip";
  detail: string;
}

export async function runDiagnostics(): Promise<DiagnosticStep[]> {
  const steps: DiagnosticStep[] = [];

  // Step 1: config
  const missingVars: string[] = [];
  if (!config.jira.host) missingVars.push("JIRA_HOST");
  if (!config.jira.email) missingVars.push("JIRA_EMAIL");
  if (!config.jira.apiToken) missingVars.push("JIRA_API_TOKEN");

  if (missingVars.length > 0) {
    steps.push({
      name: "Config",
      status: "fail",
      detail: `Missing environment variables: ${missingVars.join(", ")}`,
    });
    steps.push({ name: "Auth", status: "skip", detail: "Skipped due to missing config" });
    steps.push({ name: "Projects", status: "skip", detail: "Skipped due to missing config" });
    steps.push({ name: "Issues", status: "skip", detail: "Skipped due to missing config" });
    return steps;
  }

  const warnings: string[] = [];
  if (config.jira.host.endsWith("/")) warnings.push("JIRA_HOST has a trailing slash — remove it");
  if (!config.jira.host.startsWith("https://")) warnings.push("JIRA_HOST should start with https://");
  if (!config.jira.host.includes("atlassian.net")) warnings.push("JIRA_HOST does not look like an Atlassian Cloud URL (expected *.atlassian.net)");
  if (config.jira.email !== config.jira.email.trim()) warnings.push("JIRA_EMAIL has leading/trailing whitespace");
  if (config.jira.apiToken !== config.jira.apiToken.trim()) warnings.push("JIRA_API_TOKEN has leading/trailing whitespace");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.jira.email)) warnings.push(`JIRA_EMAIL does not look like a valid email address: "${config.jira.email}"`);

  const maskedToken = config.jira.apiToken.slice(0, 4) + "****" + config.jira.apiToken.slice(-4);
  const tokenLen = config.jira.apiToken.length;
  const configDetail = `host=${config.jira.host} | email="${config.jira.email}" | apiToken=${maskedToken} (${tokenLen} chars)`;
  steps.push({
    name: "Config",
    status: warnings.length > 0 ? "fail" : "pass",
    detail: warnings.length > 0 ? `${configDetail} — WARNING: ${warnings.join("; ")}` : configDetail,
  });

  if (warnings.length > 0) {
    steps.push({ name: "Auth (raw HTTP)", status: "skip", detail: "Skipped due to config warnings" });
    steps.push({ name: "Auth (jira.js)", status: "skip", detail: "Skipped due to config warnings" });
    steps.push({ name: "Projects", status: "skip", detail: "Skipped due to config warnings" });
    steps.push({ name: "Issues", status: "skip", detail: "Skipped due to config warnings" });
    return steps;
  }

  // Step 2: raw HTTP auth (bypasses jira.js to isolate credential vs library issues)
  const rawCredential = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString("base64");
  try {
    const rawRes = await fetch(`${config.jira.host}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${rawCredential}`, Accept: "application/json" },
    });
    if (rawRes.ok) {
      const body = await rawRes.json() as { displayName?: string; emailAddress?: string };
      steps.push({
        name: "Auth (raw HTTP)",
        status: "pass",
        detail: `Direct fetch succeeded — authenticated as ${body.displayName} (${body.emailAddress})`,
      });
    } else {
      const text = await rawRes.text().catch(() => "");
      steps.push({
        name: "Auth (raw HTTP)",
        status: "fail",
        detail: `HTTP ${rawRes.status} — credentials rejected by Jira directly. Check JIRA_EMAIL matches your Atlassian account and regenerate JIRA_API_TOKEN at https://id.atlassian.com/manage-profile/security/api-tokens. Response: ${text.slice(0, 200)}`,
      });
      steps.push({ name: "Auth (jira.js)", status: "skip", detail: "Skipped — raw HTTP already failed" });
      steps.push({ name: "Projects", status: "skip", detail: "Skipped due to auth failure" });
      steps.push({ name: "Issues", status: "skip", detail: "Skipped due to auth failure" });
      return steps;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ name: "Auth (raw HTTP)", status: "fail", detail: `Network error: ${msg}` });
    steps.push({ name: "Auth (jira.js)", status: "skip", detail: "Skipped — raw HTTP failed" });
    steps.push({ name: "Projects", status: "skip", detail: "Skipped due to auth failure" });
    steps.push({ name: "Issues", status: "skip", detail: "Skipped due to auth failure" });
    return steps;
  }

  // Step 3: auth via jira.js client
  let jira: ReturnType<typeof getClient>;
  try {
    jira = getClient();
    const me = await jira.myself.getCurrentUser();
    steps.push({
      name: "Auth (jira.js)",
      status: "pass",
      detail: `jira.js authenticated as ${me.displayName} (${me.emailAddress})`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({
      name: "Auth (jira.js)",
      status: "fail",
      detail: `Raw HTTP passed but jira.js failed — likely a jira.js configuration bug. Error: ${msg}`,
    });
    steps.push({ name: "Projects", status: "skip", detail: "Skipped due to jira.js auth failure" });
    steps.push({ name: "Issues", status: "skip", detail: "Skipped due to jira.js auth failure" });
    return steps;
  }

  // Step 3: projects
  try {
    const result = await jira.projects.searchProjects({ maxResults: 5 });
    const count = result.values?.length ?? 0;
    const names = (result.values ?? []).map((p) => p.key).join(", ");
    steps.push({
      name: "Projects",
      status: "pass",
      detail: `Returned ${count} project(s): ${names || "(none)"}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ name: "Projects", status: "fail", detail: msg });
    steps.push({ name: "Issues", status: "skip", detail: "Skipped due to projects failure" });
    return steps;
  }

  // Step 4: issues
  try {
    const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
      jql: "ORDER BY updated DESC",
      maxResults: 1,
      fields: ["summary"],
    });
    const count = result.issues?.length ?? 0;
    steps.push({
      name: "Issues",
      status: "pass",
      detail: `JQL query succeeded — issues returned: ${count}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ name: "Issues", status: "fail", detail: msg });
  }

  return steps;
}

const DEFAULT_SEARCH_FIELDS = ["summary", "status", "assignee", "priority", "issuetype", "updated"];

export interface JiraSearchIssue {
  key: string;
  fields: Record<string, unknown>;
}

export async function searchIssues(
  jql: string,
  maxResults = 50,
  fields: string[] = DEFAULT_SEARCH_FIELDS,
): Promise<{ issues: JiraSearchIssue[]; nextPageToken: string | null }> {
  const jira = getClient();
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql,
    maxResults,
    fields,
  });
  return {
    issues: (result.issues ?? []).map((issue) => ({
      key: issue.key ?? "",
      fields: issue.fields as Record<string, unknown>,
    })),
    nextPageToken: result.nextPageToken ?? null,
  };
}

export async function getIssues(projectKey: string, maxResults = 50) {
  const jira = getClient();
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `project = "${projectKey}" ORDER BY updated DESC`,
    maxResults,
    fields: ["summary", "status", "assignee", "priority", "issuetype", "updated"],
  });
  return {
    issues: (result.issues ?? []).map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      assignee: issue.fields.assignee?.displayName ?? "Unassigned",
      priority: issue.fields.priority?.name,
      type: issue.fields.issuetype?.name,
      updated: issue.fields.updated,
    })),
  };
}
