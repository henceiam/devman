import type { MissionStory } from "../api/client";
import type { MilestoneRow } from "./milestoneProjection";
import { statusBadge, COPY_STATUS_COLORS } from "./statusUtils";
import PrStateIcon from "./PrStateIcon";
import JiraLink from "./JiraLink";
import LabelIcons from "./LabelIcons";

interface MilestoneGroupProps {
  row: MilestoneRow;
  open: boolean;
  onToggle: () => void;
  onStorySelect?: (key: string) => void;
  onEditDescription?: () => void;
}

export default function MilestoneGroup({ row, open, onToggle, onStorySelect, onEditDescription }: MilestoneGroupProps) {
  const isSpecial = row.kind === "unassigned" || row.kind === "out-of-scope";
  const { total, done, inProgress, toDo } = row.statusCounts;

  return (
    <div className={`rounded-lg border shadow-sm ${isSpecial ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"}`}>
      <div className={`flex items-center transition ${isSpecial ? "hover:bg-orange-100" : "hover:bg-gray-50"}`}>
        <button
          onClick={onToggle}
          aria-expanded={open}
          aria-label={row.displayName}
          className="flex min-w-0 flex-1 items-center gap-4 px-6 py-4 text-left"
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
            <span className="text-sm font-semibold text-gray-800">{row.displayName}</span>
          </div>
          {row.description && <p className="text-xs italic text-gray-500">{row.description}</p>}
          {total > 0 && <div className="flex h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
            {done > 0 && <div className="bg-green-500" style={{ width: `${(done / total) * 100}%` }} />}
            {inProgress > 0 && <div className="bg-orange-400" style={{ width: `${(inProgress / total) * 100}%` }} />}
            {toDo > 0 && <div className="bg-gray-300" style={{ width: `${(toDo / total) * 100}%` }} />}
          </div>}
        </div>

        {/* Counts */}
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
          {total > 0 && <>
            <span>{total} {total === 1 ? "story" : "stories"}</span>
            <span className="text-green-600">{done} done</span>
            <span className="text-orange-500">{inProgress} in progress</span>
            <span className="text-gray-400">{toDo} to do</span>
          </>}
        </div>
        </button>
        {row.descriptionEditable && onEditDescription && (
          <button
            onClick={onEditDescription}
            className="mr-5 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Edit milestone description"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {row.visibleStories.length === 0 && (
            <li className="px-6 py-4 text-sm text-gray-500">No stories yet</li>
          )}
          {row.visibleStories.map((story: MissionStory) => (
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
