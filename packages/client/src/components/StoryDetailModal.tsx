import { useEffect, useState } from "react";
import { api, type StoryDetailResponse, type SubtaskItem, type StoryGitHubResponse, type WayfinderResponse, type CommentItem } from "../api/client";
import { statusBadge, ageInfo } from "./statusUtils";
import PrStateIcon from "./PrStateIcon";
import LabelIcons from "./LabelIcons";
import GitHubPrTab from "./GitHubPrTab";
import WayfinderTab from "./WayfinderTab";
import JiraLink from "./JiraLink";

interface StoryDetailModalProps {
  storyKey: string;
  hideDone: boolean;
  onClose: () => void;
}

/** Render ADF (Atlassian Document Format) or plain text */
function renderContent(content: unknown): React.ReactNode {
  if (!content) return <p className="text-sm text-gray-400 italic">No content</p>;
  if (typeof content === "string") {
    return <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">{content}</div>;
  }
  // ADF document
  if (typeof content === "object" && content !== null && "type" in content) {
    const doc = content as AdfNode;
    return <div className="prose prose-sm max-w-none text-gray-700">{renderAdfNode(doc)}</div>;
  }
  return <p className="text-sm text-gray-400 italic">Unable to render content</p>;
}

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

function renderAdfNode(node: AdfNode): React.ReactNode {
  if (node.type === "text") {
    let element: React.ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "strong") element = <strong>{element}</strong>;
      else if (mark.type === "em") element = <em>{element}</em>;
      else if (mark.type === "code") element = <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{element}</code>;
      else if (mark.type === "link") element = <a href={String(mark.attrs?.href ?? "#")} className="text-blue-600 underline" target="_blank" rel="noreferrer">{element}</a>;
    }
    return element;
  }

  const renderedChildren = (node.content ?? []).map((child, i) => {
    const rendered = renderAdfNode(child);
    return <span key={i}>{rendered}</span>;
  });

  switch (node.type) {
    case "doc":
      return <>{renderedChildren}</>;
    case "paragraph":
      return <p className="mb-2">{renderedChildren}</p>;
    case "heading": {
      const level = (node.attrs?.level as number) ?? 3;
      if (level === 1) return <h1 className="mb-2 font-semibold">{renderedChildren}</h1>;
      if (level === 2) return <h2 className="mb-2 font-semibold">{renderedChildren}</h2>;
      if (level === 3) return <h3 className="mb-2 font-semibold">{renderedChildren}</h3>;
      if (level === 4) return <h4 className="mb-2 font-semibold">{renderedChildren}</h4>;
      if (level === 5) return <h5 className="mb-2 font-semibold">{renderedChildren}</h5>;
      return <h6 className="mb-2 font-semibold">{renderedChildren}</h6>;
    }
    case "bulletList":
      return <ul className="mb-2 list-disc pl-5">{renderedChildren}</ul>;
    case "orderedList":
      return <ol className="mb-2 list-decimal pl-5">{renderedChildren}</ol>;
    case "listItem":
      return (
        <li>
          {(node.content ?? []).map((child, i) =>
            child.type === "paragraph" ? (
              <span key={i}>
                {(child.content ?? []).map((c, j) => (
                  <span key={j}>{renderAdfNode(c)}</span>
                ))}
              </span>
            ) : (
              <span key={i}>{renderAdfNode(child)}</span>
            )
          )}
        </li>
      );
    case "codeBlock":
      return <pre className="mb-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs">{renderedChildren}</pre>;
    case "blockquote":
      return <blockquote className="mb-2 border-l-4 border-gray-300 pl-3 italic">{renderedChildren}</blockquote>;
    case "rule":
      return <hr className="my-3 border-gray-200" />;
    case "hardBreak":
      return <br />;
    case "inlineCard": {
      const url = String(node.attrs?.url ?? "#");
      // Extract issue key from URL for a compact label (e.g. "EBBACKLOG-123")
      const match = url.match(/\/browse\/([A-Z]+-\d+)/);
      const label = match ? match[1] : url;
      return <a href={url} className="text-blue-600 underline" target="_blank" rel="noreferrer">{label}</a>;
    }
    case "mediaSingle":
    case "media":
      return null;
    default:
      return <>{renderedChildren}</>;
  }
}

function SubtaskKanban({ subtasks, hideDone, isEpic }: { subtasks: SubtaskItem[]; hideDone: boolean; isEpic?: boolean }) {
  const columns: { label: string; category: string; borderColor: string }[] = [
    { label: "To Do", category: "new", borderColor: "border-gray-300" },
    { label: "In Progress", category: "indeterminate", borderColor: "border-orange-300" },
    ...(!hideDone ? [{ label: "Done", category: "done", borderColor: "border-green-300" }] : []),
  ];

  const grouped = new Map<string, SubtaskItem[]>();
  for (const st of subtasks) {
    const cat = st.statusCategory;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(st);
  }

  return (
    <div className={`grid gap-3 ${hideDone ? "grid-cols-2" : "grid-cols-3"}`}>
      {columns.map((col) => {
        const items = grouped.get(col.category) ?? [];
        return (
          <div key={col.category} className={`rounded-lg border-t-2 ${col.borderColor} bg-gray-50 p-3`}>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-600">{col.label}</h4>
              <span className="text-[10px] text-gray-400">{items.length}</span>
            </div>
            <div className="space-y-1.5">
              {items.map((st) => (
                <div key={st.key} className="rounded border border-gray-200 bg-white p-2 shadow-sm">
                  <div className="flex items-start gap-1.5">
                    {(() => {
  const { color, label } = ageInfo(st.latestActivity);
  return (
    <span
      className="mt-1 h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      title={label}
    />
  );
})()}
                    <p className="min-w-0 flex-1 text-xs leading-snug text-gray-700">{st.summary}</p>
                    <LabelIcons labels={st.labels} />
                    {st.assignee !== "Unassigned" && (
                      st.avatarUrl ? (
                        <img src={st.avatarUrl} alt={st.assignee} title={st.assignee} className="h-5 w-5 shrink-0 rounded-full" />
                      ) : (
                        <span title={st.assignee} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-medium text-gray-600">
                          {st.assignee.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                        </span>
                      )
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-gray-400">
                      <JiraLink issueKey={st.key} className="text-[10px]" />
                    </span>
                    {st.prState && <PrStateIcon state={st.prState} />}
                    {statusBadge(st.status)}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-xs text-gray-400 italic">{isEpic ? "No stories" : "No subtasks"}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StoryDetailModal({ storyKey, hideDone, onClose }: StoryDetailModalProps) {
  const [detail, setDetail] = useState<StoryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"subtasks" | "details" | "plan" | "github" | "wayfinder" | "comments">("subtasks");
  const [githubData, setGithubData] = useState<StoryGitHubResponse | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [wayfinderData, setWayfinderData] = useState<WayfinderResponse | null>(null);
  const [wayfinderLoading, setWayfinderLoading] = useState(false);
  const [wayfinderError, setWayfinderError] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setGithubData(null);
    setGithubError(null);
    setWayfinderData(null);
    setWayfinderError(null);
    setComments(null);
    setCommentsError(null);
    api.missions
      .getStoryDetail(storyKey)
      .then((data) => {
        setDetail(data);
        setActiveTab(data.subtasks.length > 0 ? "subtasks" : "details");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // Load comments in parallel
    setCommentsLoading(true);
    api.missions
      .getStoryComments(storyKey)
      .then((data) => setComments(data.comments))
      .catch((e) => setCommentsError(e.message))
      .finally(() => setCommentsLoading(false));
  }, [storyKey]);

  const handleGithubTab = () => {
    setActiveTab("github");
    if (!githubData && !githubLoading) {
      setGithubLoading(true);
      setGithubError(null);
      api.missions
        .getStoryGithub(storyKey)
        .then(setGithubData)
        .catch((e) => setGithubError(e.message))
        .finally(() => setGithubLoading(false));
    }
  };

  const handleWayfinderTab = () => {
    setActiveTab("wayfinder");
    if (!wayfinderData && !wayfinderLoading) {
      setWayfinderLoading(true);
      setWayfinderError(null);
      api.missions
        .getStoryWayfinder(storyKey)
        .then(setWayfinderData)
        .catch((e) => setWayfinderError(e.message))
        .finally(() => setWayfinderLoading(false));
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
          <span className="font-mono text-sm text-gray-400">
            <JiraLink issueKey={storyKey} className="text-sm" />
          </span>
          {detail && statusBadge(detail.status)}
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900">
            {detail?.summary ?? "Loading…"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {detail && (
          <div className="flex gap-1 border-b border-gray-200 px-6">
            <button
              onClick={() => setActiveTab("subtasks")}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition ${
                activeTab === "subtasks"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {detail.issuetype === "Epic" ? "Stories" : "Subtasks"} ({detail.subtasks.length})
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition ${
                activeTab === "details"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Details
            </button>
            {detail.implementationPlan != null && (
              <button
                onClick={() => setActiveTab("plan")}
                className={`border-b-2 px-3 py-2 text-xs font-medium transition ${
                  activeTab === "plan"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Implementation Plan
              </button>
            )}
            {detail.prState && (
              <button
                onClick={handleGithubTab}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition ${
                  activeTab === "github"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <PrStateIcon state={detail.prState} />
                GitHub
              </button>
            )}
            {detail.labels.includes("wayfinder:map") && (
              <button
                onClick={handleWayfinderTab}
                className={`border-b-2 px-3 py-2 text-xs font-medium transition ${
                  activeTab === "wayfinder"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Wayfinder
              </button>
            )}
            <button
              onClick={() => setActiveTab("comments")}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition ${
                activeTab === "comments"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Comments{comments !== null ? ` (${comments.length})` : commentsLoading ? " (…)" : ""}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-sm text-gray-500">Loading story details…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {detail && activeTab === "subtasks" && (
            detail.subtasks.length > 0 ? (
              <SubtaskKanban subtasks={detail.subtasks} hideDone={hideDone} isEpic={detail.issuetype === "Epic"} />
            ) : (
              <p className="text-sm text-gray-400 italic">
                {detail.issuetype === "Epic" ? "No stories" : "No subtasks"}
              </p>
            )
          )}

          {detail && activeTab === "details" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Description</h3>
                {renderContent(detail.description)}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Acceptance Criteria</h3>
                {renderContent(detail.acceptanceCriteria)}
              </div>
            </div>
          )}

          {detail && activeTab === "plan" && renderContent(detail.implementationPlan)}

          {detail && activeTab === "comments" && (
            commentsLoading ? (
              <p className="text-sm text-gray-500">Loading comments…</p>
            ) : commentsError ? (
              <p className="text-sm text-red-600">Error: {commentsError}</p>
            ) : comments && comments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No comments</p>
            ) : (
              <div className="space-y-4">
                {(comments ?? []).map((c) => (
                  <div key={c.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.author} className="h-6 w-6 rounded-full" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-[9px] font-medium text-gray-600">
                          {c.author.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                        </span>
                      )}
                      <span className="text-xs font-medium text-gray-700">{c.author}</span>
                      <span className="text-[10px] text-gray-400">{new Date(c.created).toLocaleString()}</span>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      {renderContent(c.body)}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "github" && (
            githubLoading ? (
              <p className="text-sm text-gray-500">Loading GitHub data…</p>
            ) : githubError ? (
              <p className="text-sm text-red-600">GitHub error: {githubError}</p>
            ) : githubData ? (
              <GitHubPrTab data={githubData} />
            ) : null
          )}

          {activeTab === "wayfinder" && (
            wayfinderLoading ? (
              <p className="text-sm text-gray-500">Loading Wayfinder data…</p>
            ) : wayfinderError ? (
              <p className="text-sm text-red-600">Wayfinder error: {wayfinderError}</p>
            ) : wayfinderData ? (
              <WayfinderTab tickets={wayfinderData.tickets} />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
