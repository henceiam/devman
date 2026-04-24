import { useState } from "react";
import type { MissionStory } from "../api/client";

const STATUS_COLORS: Record<string, string> = {
  "Request": "bg-white text-gray-600 border border-gray-200",
  "To do": "bg-white text-gray-600 border border-gray-200",
  "To Refine": "bg-blue-100 text-blue-700",
  "In Design": "bg-purple-100 text-purple-700",
  "Ready for Design": "bg-purple-100 text-purple-700",
  "READY FOR DEVELOPMENT": "bg-blue-200 text-blue-800",
  "To Investigate": "bg-blue-200 text-blue-800",
  "In Progress": "bg-orange-100 text-orange-700",
  "Under investigation": "bg-orange-100 text-orange-700",
  "On Hold": "bg-orange-100 text-orange-700",
  "Code review": "bg-yellow-100 text-yellow-700",
  "Ready for test": "bg-yellow-100 text-yellow-700",
  "In Test": "bg-yellow-100 text-yellow-700",
  "Waiting for support": "bg-yellow-100 text-yellow-700",
  "Waiting for customer": "bg-yellow-100 text-yellow-700",
  "Ready for Deploy": "bg-lime-100 text-lime-700",
  "Closed": "bg-green-100 text-green-700",
  "Rejected": "bg-gray-200 text-gray-500",
};

const COPY_STATUS_COLORS: Record<string, string> = {
  "Copy - ready to start": "bg-sky-100 text-sky-700",
  "Copy - in progress": "bg-sky-100 text-sky-700",
  "Translation - ready to start": "bg-yellow-100 text-yellow-700",
  "Translation - in progress": "bg-yellow-100 text-yellow-700",
  "Translation - done": "bg-green-100 text-green-700",
};

function statusBadge(status: string) {
  const cls = STATUS_COLORS[status] ?? "bg-red-100 text-red-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

function categoryLabel(key: string) {
  if (key === "done") return "Done";
  if (key === "indeterminate") return "In Progress";
  return "To Do";
}

interface MilestoneGroupProps {
  name: string;
  stories: MissionStory[];
}

export default function MilestoneGroup({ name, stories }: MilestoneGroupProps) {
  const [open, setOpen] = useState(false);

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
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition"
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

        {/* Milestone name */}
        <span className="min-w-0 flex-1 text-sm font-semibold text-gray-800">{name}</span>

        {/* Counts */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{total} {total === 1 ? "story" : "stories"}</span>
          <span className="text-green-600">{done} done</span>
          <span className="text-orange-500">{inProgress} in progress</span>
          <span className="text-gray-400">{toDo} to do</span>
        </div>

        {/* Progress bar */}
        <div className="flex h-2 w-32 shrink-0 overflow-hidden rounded-full bg-gray-100">
          {done > 0 && (
            <div className="bg-green-500" style={{ width: `${(done / total) * 100}%` }} />
          )}
          {inProgress > 0 && (
            <div className="bg-orange-400" style={{ width: `${(inProgress / total) * 100}%` }} />
          )}
          {toDo > 0 && (
            <div className="bg-gray-300" style={{ width: `${(toDo / total) * 100}%` }} />
          )}
        </div>
      </button>

      {open && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {stories.map((story) => (
            <li key={story.key} className="flex items-center gap-3 px-6 py-3 text-sm">
              <span className="w-28 shrink-0 font-mono text-xs text-gray-400">{story.key}</span>
              {statusBadge(story.status)}
              <span className="min-w-0 flex-1 truncate">{story.summary}</span>
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
