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
