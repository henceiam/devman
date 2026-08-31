import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { MissionStory } from "../api/client";
import PrStateIcon from "./PrStateIcon";
import LabelIcons from "./LabelIcons";
import { getStatusStyle } from "./statusUtils";
import JiraLink from "./JiraLink";

interface StoryCardProps {
  story: MissionStory;
  onSelect?: (key: string) => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function StoryCard({ story, onSelect }: StoryCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: story.key,
    data: { story },
  });
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const { dotColor, bgColor } = getStatusStyle(story.status);

  const style = {
    ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : {}),
    backgroundColor: bgColor,
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerStart.current || !onSelect) return;
    const dx = Math.abs(e.clientX - pointerStart.current.x);
    const dy = Math.abs(e.clientY - pointerStart.current.y);
    // Only treat as click if pointer barely moved (not a drag)
    if (dx < 5 && dy < 5) {
      onSelect(story.key);
    }
    pointerStart.current = null;
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        // Forward to dnd-kit's listener
        (listeners as Record<string, (e: React.PointerEvent) => void>)?.onPointerDown?.(e);
      }}
      onPointerUp={handlePointerUp}
      className={`rounded-md border p-2 shadow-sm transition cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-blue-300" : "border-gray-200 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Status dot — full status color */}
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          title={story.status}
        />

        {/* Summary */}
        <p className="min-w-0 flex-1 text-xs leading-snug text-gray-700 line-clamp-2">
          {story.summary}
        </p>

        <LabelIcons labels={story.labels} />

        {/* Avatar */}
        {story.assignee !== "Unassigned" && (
          story.avatarUrl ? (
            <img
              src={story.avatarUrl}
              alt={story.assignee}
              title={story.assignee}
              className="h-6 w-6 shrink-0 rounded-full"
            />
          ) : (
            <span
              title={story.assignee}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600"
            >
              {initials(story.assignee)}
            </span>
          )
        )}
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-gray-400">
          <JiraLink issueKey={story.key} className="text-[10px]">{story.key.split("-")[1]}</JiraLink>
        </span>
        {story.prState && <PrStateIcon state={story.prState} />}
        {story.size && (
          <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">{story.size}</span>
        )}
      </div>
      {story.subtaskProgress && story.subtaskProgress.total > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
            {story.subtaskProgress.done > 0 && <div className="bg-green-500" style={{ width: `${(story.subtaskProgress.done / story.subtaskProgress.total) * 100}%` }} />}
            {story.subtaskProgress.inProgress > 0 && <div className="bg-orange-400" style={{ width: `${(story.subtaskProgress.inProgress / story.subtaskProgress.total) * 100}%` }} />}
          </div>
          <span className="text-[10px] text-gray-400">{story.subtaskProgress.done}/{story.subtaskProgress.total}</span>
        </div>
      )}
    </div>
  );
}
