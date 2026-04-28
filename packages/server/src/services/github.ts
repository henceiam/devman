import { Octokit } from "@octokit/rest";
import { config } from "../config.js";

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
