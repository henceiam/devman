import type { PrDetail, PrReviewer, StoryGitHubResponse } from "../api/client";
import PrStateIcon from "./PrStateIcon";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const REVIEWER_STATE_CONFIG: Record<
  PrReviewer["state"],
  { label: string; className: string; icon: string }
> = {
  APPROVED: { label: "Approved", icon: "✓", className: "bg-green-100 text-green-700" },
  CHANGES_REQUESTED: { label: "Changes requested", icon: "✗", className: "bg-red-100 text-red-700" },
  COMMENTED: { label: "Commented", icon: "💬", className: "bg-gray-100 text-gray-600" },
  PENDING: { label: "Pending", icon: "⏳", className: "bg-yellow-50 text-yellow-600" },
};

function ReviewerBadge({ reviewer }: { reviewer: PrReviewer }) {
  const cfg = REVIEWER_STATE_CONFIG[reviewer.state];
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-white px-2.5 py-1.5 shadow-sm">
      {reviewer.avatarUrl ? (
        <img
          src={reviewer.avatarUrl}
          alt={reviewer.login}
          className="h-6 w-6 rounded-full"
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
          {reviewer.login.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="text-xs text-gray-700">{reviewer.login}</span>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.className}`}>
        {cfg.icon} {cfg.label}
      </span>
    </div>
  );
}

function PrCard({ pr }: { pr: PrDetail }) {
  const isOpen = pr.state === "open" || pr.state === "draft";
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-3">
        <div className="mt-0.5">
          <PrStateIcon state={pr.state} size="md" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-blue-600 hover:underline truncate"
            >
              {pr.title}
            </a>
            {pr.draft && (
              <span className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-500">
                Draft
              </span>
            )}
            {pr.labels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono">#{pr.number}</span>
            <span>·</span>
            <span>{pr.repositoryName}</span>
            <span>·</span>
            <span title={formatDate(pr.openedAt)}>opened {timeAgo(pr.openedAt)}</span>
          </div>
        </div>
      </div>

      {/* Branch + author row */}
      <div className="flex items-center gap-4 px-4 py-2.5 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="text-teal-500">⎇</span>
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px]">{pr.sourceBranch}</code>
          <span className="text-gray-400">→</span>
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px]">{pr.targetBranch}</code>
        </div>
        {pr.author.avatarUrl ? (
          <img src={pr.author.avatarUrl} alt={pr.author.login} title={`Opened by ${pr.author.login}`} className="h-5 w-5 rounded-full" />
        ) : null}
        <span className="text-gray-500">by <strong>{pr.author.login}</strong></span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
        <span title="Changed files">📄 {pr.changedFiles} files</span>
        <span className="text-green-600 font-medium">+{pr.additions}</span>
        <span className="text-red-500 font-medium">−{pr.deletions}</span>
        {pr.commentCount > 0 && <span title="Comments">💬 {pr.commentCount}</span>}
        {!isOpen && (
          <span className="ml-auto text-gray-400" title={pr.mergedAt ? formatDate(pr.mergedAt) : pr.closedAt ? formatDate(pr.closedAt) : ""}>
            {pr.mergedAt ? `Merged ${timeAgo(pr.mergedAt)}` : pr.closedAt ? `Closed ${timeAgo(pr.closedAt)}` : ""}
          </span>
        )}
        {isOpen && (
          <span className="ml-auto text-gray-400" title={formatDate(pr.updatedAt)}>
            Updated {timeAgo(pr.updatedAt)}
          </span>
        )}
      </div>

      {/* Reviewers */}
      {pr.reviewers.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Reviewers
          </p>
          <div className="flex flex-wrap gap-2">
            {pr.reviewers.map((r) => (
              <ReviewerBadge key={r.login} reviewer={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface GitHubPrTabProps {
  data: StoryGitHubResponse;
}

export default function GitHubPrTab({ data }: GitHubPrTabProps) {
  if (data.prs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
        {data.hasBranch ? (
          <>
            <span className="text-3xl text-teal-400">⎇</span>
            <p className="text-sm">Branch exists — no pull request yet</p>
          </>
        ) : (
          <>
            <span className="text-2xl">🔗</span>
            <p className="text-sm">No pull requests or branches linked</p>
          </>
        )}
      </div>
    );
  }

  // Sort: open first, then by updatedAt desc
  const sorted = [...data.prs].sort((a, b) => {
    const openScore = (s: string) => (s === "open" || s === "draft" ? 0 : 1);
    const scoreDiff = openScore(a.state) - openScore(b.state);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="space-y-4">
      {sorted.map((pr) => (
        <PrCard key={pr.number} pr={pr} />
      ))}
    </div>
  );
}
