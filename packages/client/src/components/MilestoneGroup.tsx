import { useState } from "react";
import type { MissionStory } from "../api/client";
import { statusBadge, COPY_STATUS_COLORS } from "./statusUtils";
import PrStateIcon from "./PrStateIcon";
import JiraLink from "./JiraLink";
import LabelIcons from "./LabelIcons";

function categoryLabel(key: string) {
  if (key === "done") return "Done";
  if (key === "indeterminate") return "In Progress";
  return "To Do";
}

interface MilestoneGroupProps {
  name: string;
  stories: MissionStory[];
  onStorySelect?: (key: string) => void;
  summary?: string;
  onEditSummary?: () => void;
}

export default function MilestoneGroup({ name, stories, onStorySelect, summary, onEditSummary }: MilestoneGroupProps) {
  const [open, setOpen] = useState(false);
  const isSpecial = name === "No milestone" || name === "Out of scope";

  const total = stories.length;
  const breakdown = stories.reduce<Record<string, number>>((acc, s) => {
    const cat = categoryLabel(s.statusCategory);
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  const done = breakdown["Done"] ?? 0;
  const inProgress = breakdown["In Progress"] ?? 0;
  const toDo = breakdown["To Do"] ?? 0;

  return (
    <div className={`rounded-lg border shadow-sm ${isSpecial ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-4 px-6 py-4 text-left transition ${isSpecial ? "hover:bg-orange-100" : "hover:bg-gray-50"}`}
      >
        {/* Chevron */}
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        {/* Milestone name + progress bar */}
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{name}</span>
            {!isSpecial && onEditSummary && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditSummary(); }}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Edit summary"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                </svg>
              </button>
            )}
          </div>
          {!isSpecial && summary && <p className="text-xs italic text-gray-500">{summary}</p>}
          <div className="flex h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
            {done > 0 && <div className="bg-green-500" style={{ width: `${(done / total) * 100}%` }} />}
            {inProgress > 0 && <div className="bg-orange-400" style={{ width: `${(inProgress / total) * 100}%` }} />}
            {toDo > 0 && <div className="bg-gray-300" style={{ width: `${(toDo / total) * 100}%` }} />}
          </div>
        </div>

        {/* Counts */}
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
          <span>{total} {total === 1 ? "story" : "stories"}</span>
          <span className="text-green-600">{done} done</span>
          <span className="text-orange-500">{inProgress} in progress</span>
          <span className="text-gray-400">{toDo} to do</span>
        </div>
      </button>

      {open && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {stories.map((story) => (
            <li
              key={story.key}
              onClick={() => onStorySelect?.(story.key)}
              className="flex cursor-pointer items-center gap-3 px-6 py-3 text-sm hover:bg-gray-50 transition"
            >
              <span className="w-28 shrink-0 font-mono text-xs text-gray-400">
                <JiraLink issueKey={story.key} />
              </span>
              {statusBadge(story.status)}
              {story.prState && <PrStateIcon state={story.prState} />}
              <span className="min-w-0 flex-1 truncate">{story.summary}</span>
              <LabelIcons labels={story.labels} />
              {story.subtaskProgress && story.subtaskProgress.total > 0 && (
                <div className="flex w-20 shrink-0 items-center gap-1.5">
                  <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    {story.subtaskProgress.done > 0 && <div className="bg-green-500" style={{ width: `${(story.subtaskProgress.done / story.subtaskProgress.total) * 100}%` }} />}
                    {story.subtaskProgress.inProgress > 0 && <div className="bg-orange-400" style={{ width: `${(story.subtaskProgress.inProgress / story.subtaskProgress.total) * 100}%` }} />}
                  </div>
                  <span className="text-[10px] text-gray-400">{story.subtaskProgress.done}/{story.subtaskProgress.total}</span>
                </div>
              )}
              {story.size && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {story.size}
                </span>
              )}
              {story.copyStatus && (
                <span className={`rounded px-1.5 py-0.5 text-xs ${COPY_STATUS_COLORS[story.copyStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {story.copyStatus}
                </span>
              )}
              <span className="w-28 shrink-0 text-right text-xs text-gray-400">{story.assignee}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
