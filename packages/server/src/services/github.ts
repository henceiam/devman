import { Octokit } from "@octokit/rest";
import { config } from "../config.js";
import { getIssueGroupingByKeys } from "./jira.js";
import type { BaseTranslationSnapshot } from "./translations.js";

let client: Octokit | null = null;

function getClient(): Octokit {
  if (!client) {
    if (!config.github.token) {
      throw new Error("GitHub configuration missing. Set GITHUB_TOKEN in .env");
    }
    client = new Octokit({ auth: config.github.token });
  }
  return client;
}

export async function getRepos(perPage = 30) {
  const octokit = getClient();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: perPage,
  });
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    language: r.language,
    updatedAt: r.updated_at,
    openIssuesCount: r.open_issues_count,
    htmlUrl: r.html_url,
    private: r.private,
  }));
}

export async function getPrWithReviews(owner: string, repo: string, prNumber: number) {
  const octokit = getClient();
  const [prRes, reviewsRes, requestsRes] = await Promise.all([
    octokit.pulls.get({ owner, repo, pull_number: prNumber }),
    octokit.pulls.listReviews({ owner, repo, pull_number: prNumber, per_page: 100 }),
    octokit.pulls.listRequestedReviewers({ owner, repo, pull_number: prNumber }),
  ]);
  return {
    pr: prRes.data,
    reviews: reviewsRes.data,
    requestedReviewers: requestsRes.data.users ?? [],
  };
}

export async function getBaseTranslationSnapshot(): Promise<BaseTranslationSnapshot> {
  const octokit = getClient();
  const [baseContents, metadataContent] = await Promise.all([
    octokit.repos.getContent({ owner: "DoctrinAB", repo: "translations", path: "base" }),
    octokit.repos.getContent({ owner: "DoctrinAB", repo: "translations", path: "base/i18n.json" }),
  ]);

  if (!Array.isArray(baseContents.data)) {
    throw new Error("GitHub returned an invalid translations base directory");
  }

  const localeNames = baseContents.data
    .filter((entry) => entry.type === "dir")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  if (localeNames.length === 0) {
    throw new Error("The translations repository has no base locales");
  }

  const metadata = parseGitHubJsonContent(metadataContent.data, "base/i18n.json");
  if (!isJsonRecord(metadata)) {
    throw new Error("The translations repository has invalid base key metadata");
  }

  const localeResults = await Promise.all(localeNames.map(async (locale) => {
    const path = `base/${locale}/root.json`;
    const response = await octokit.repos.getContent({
      owner: "DoctrinAB",
      repo: "translations",
      path,
    });
    const values = parseGitHubJsonContent(response.data, path);
    if (!isTranslationRecord(values)) {
      throw new Error(`The translations repository has invalid base values in ${path}`);
    }
    return [locale, values] as const;
  }));

  return {
    metadataKeys: Object.keys(metadata),
    locales: Object.fromEntries(localeResults),
  };
}

function parseGitHubJsonContent(content: unknown, path: string): unknown {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error(`GitHub returned an invalid file for ${path}`);
  }
  const file = content as { type?: unknown; encoding?: unknown; content?: unknown };
  if (file.type !== "file" || file.encoding !== "base64" || typeof file.content !== "string") {
    throw new Error(`GitHub returned unreadable file content for ${path}`);
  }
  try {
    return JSON.parse(Buffer.from(file.content, "base64").toString("utf8")) as unknown;
  } catch (error) {
    throw new Error(`GitHub returned invalid JSON for ${path}`, { cause: error });
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isTranslationRecord(value: unknown): value is Record<string, string | null> {
  return isJsonRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "string" || entry === null);
}

export async function getPullRequests(owner: string, repo: string, state: "open" | "closed" | "all" = "open") {
  const octokit = getClient();
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state,
    sort: "updated",
    per_page: 30,
  });
  return data.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: pr.title,
    state: pr.state,
    user: pr.user?.login,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    htmlUrl: pr.html_url,
    draft: pr.draft,
  }));
}

export interface PullRequestContributor {
  login: string;
  avatarUrl: string | null;
}

export interface PullRequestWithReview {
  id: number;
  number: number;
  title: string;
  repo: string;
  jiraKey: string | null;
  jiraSummary: string | null;
  author: string;
  authorAvatar: string | null;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  htmlUrl: string;
  draft: boolean;
  ageDays: number;
  approved: boolean | null;
  released: boolean | null;
  releaseTag: string | null;
  releaseIsDraft: boolean;
  contributors: PullRequestContributor[];
}

const EXCLUDED_BOTS = ["dependabot[bot]"];

const PR_SEARCH_QUERY = `
  query($searchQuery: String!, $first: Int!) {
    search(query: $searchQuery, type: ISSUE, first: $first) {
      nodes {
        ... on PullRequest {
          databaseId
          number
          title
          state
          isDraft
          createdAt
          updatedAt
          mergedAt
          headRefName
          url
          author { login avatarUrl }
          repository { nameWithOwner }
          reviewDecision
          reviews(first: 10) {
            nodes { author { login avatarUrl } }
          }
        }
      }
    }
  }
`;

function buildSearchQuery(options: {
  state: "open" | "closed" | "all";
  repoFilter?: string;
  authorFilter?: string;
  excludeBots: boolean;
  sinceDays?: number;
}): string {
  const parts: string[] = [];

  if (options.state === "open") parts.push("is:open");
  else if (options.state === "closed") parts.push("is:closed");

  parts.push("is:pr", "archived:false");

  if (options.repoFilter) parts.push(`repo:${options.repoFilter}`);
  if (options.authorFilter) parts.push(`author:${options.authorFilter}`);
  if (options.excludeBots) parts.push("-author:dependabot[bot]");
  if (options.sinceDays !== undefined) {
    const date = new Date(Date.now() - options.sinceDays * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    parts.push(`updated:>=${dateStr}`);
  }

  return parts.join(" ");
}

interface GraphQLSearchNode {
  databaseId: number;
  number: number;
  title: string;
  state: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  headRefName: string;
  url: string;
  author: { login: string; avatarUrl: string | null } | null;
  repository: { nameWithOwner: string };
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
  reviews: { nodes: Array<{ author: { login: string; avatarUrl: string | null } | null }> };
}

interface GraphQLSearchResult {
  search: { nodes: GraphQLSearchNode[] };
}

function extractJiraKey(title: string, headRefName: string): string | null {
  const jiraKeyRegex = /\b([A-Z][A-Z0-9]+-\d+)\b/i;
  const fromTitle = title.match(jiraKeyRegex)?.[1];
  if (fromTitle) return fromTitle.toUpperCase();
  const fromBranch = headRefName.match(jiraKeyRegex)?.[1];
  return fromBranch ? fromBranch.toUpperCase() : null;
}

export async function getPullRequestsWithReviews(options: {
  repoFilter?: string;
  authorFilter?: string;
  excludeBots?: boolean;
  state?: "open" | "closed" | "all";
  sinceDays?: number;
}): Promise<PullRequestWithReview[]> {
  const { excludeBots = true, state = "open", sinceDays } = options;
  const octokit = getClient();

  const searchQuery = buildSearchQuery({ state, repoFilter: options.repoFilter, authorFilter: options.authorFilter, excludeBots, sinceDays });

  const [owner, repo] = options.repoFilter?.split("/") ?? [];

  const [searchResult, releaseResult] = await Promise.all([
    octokit.graphql<GraphQLSearchResult>(PR_SEARCH_QUERY, {
      searchQuery,
      first: 100,
    }),
    owner && repo
      ? octokit.graphql<{ repository: { releases: { nodes: Array<{ publishedAt: string; tagName: string; isDraft: boolean }> } } }>(
          `query($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              releases(first: 5, orderBy: {field: CREATED_AT, direction: DESC}) {
                nodes { tagName publishedAt isDraft }
              }
            }
          }`,
          { owner, repo },
        )
      : Promise.resolve(null),
  ]);

  const allReleases = releaseResult?.repository?.releases?.nodes ?? [];
  const latestNonDraftRelease = allReleases.find((r) => !r.isDraft);
  const latestRelease = allReleases[0] ?? null;

  const releaseDate = latestNonDraftRelease?.publishedAt
    ? new Date(latestNonDraftRelease.publishedAt).getTime()
    : null;
  const releaseTag = latestNonDraftRelease?.tagName ?? null;
  const releaseIsDraft = latestRelease?.isDraft ?? false;

  const nodes = searchResult.search.nodes.filter((node): node is GraphQLSearchNode => node !== null);
  const jiraKeys = [...new Set(
    nodes
      .map((node) => extractJiraKey(node.title, node.headRefName))
      .filter((key): key is string => key !== null),
  )];
  const jiraGrouping = await getIssueGroupingByKeys(jiraKeys);

  return nodes.map((node) => {
    const jiraKey = extractJiraKey(node.title, node.headRefName);
    const ageDays = Math.floor(
      (Date.now() - new Date(node.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    const authorLogin = node.author?.login;
    const reviewers = (node.reviews?.nodes ?? [])
      .map((r) => r.author)
      .filter((a): a is { login: string; avatarUrl: string | null } => a !== null && a.login !== authorLogin);
    const seen = new Set<string>();
    const contributors: PullRequestContributor[] = [];
    for (const r of reviewers) {
      if (!seen.has(r.login)) {
        seen.add(r.login);
        contributors.push({ login: r.login, avatarUrl: r.avatarUrl });
      }
    }

    let released: boolean | null = null;
    if (node.mergedAt) {
      const mergedAtMs = new Date(node.mergedAt).getTime();
      released = releaseDate !== null ? mergedAtMs <= releaseDate : false;
    }

    return {
      id: node.databaseId,
      number: node.number,
      title: node.title,
      repo: node.repository.nameWithOwner,
      jiraKey: jiraKey ? (jiraGrouping[jiraKey]?.groupKey ?? jiraKey) : null,
      jiraSummary: jiraKey ? (jiraGrouping[jiraKey]?.groupSummary ?? null) : null,
      author: authorLogin ?? "unknown",
      authorAvatar: node.author?.avatarUrl ?? null,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      mergedAt: node.mergedAt,
      htmlUrl: node.url,
      draft: node.isDraft,
      ageDays,
      approved: node.reviewDecision === "APPROVED",
      released,
      releaseTag,
      releaseIsDraft,
      contributors,
    };
  });
}
