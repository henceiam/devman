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

  const maskedToken = config.jira.apiToken.slice(0, 4) + "****" + config.jira.apiToken.slice(-4);
  steps.push({
    name: "Config",
    status: "pass",
    detail: `host=${config.jira.host}, email=${config.jira.email}, apiToken=${maskedToken}`,
  });

  // Step 2: auth
  let jira: ReturnType<typeof getClient>;
  try {
    jira = getClient();
    const me = await jira.myself.getCurrentUser();
    steps.push({
      name: "Auth",
      status: "pass",
      detail: `Authenticated as ${me.displayName} (${me.emailAddress})`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ name: "Auth", status: "fail", detail: msg });
    steps.push({ name: "Projects", status: "skip", detail: "Skipped due to auth failure" });
    steps.push({ name: "Issues", status: "skip", detail: "Skipped due to auth failure" });
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
    const total = result.total ?? 0;
    steps.push({
      name: "Issues",
      status: "pass",
      detail: `JQL query succeeded — total issues accessible: ${total}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ name: "Issues", status: "fail", detail: msg });
  }

  return steps;
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
