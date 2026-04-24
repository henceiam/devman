import { useDraggable } from "@dnd-kit/core";
import type { MissionStory } from "../api/client";

const STATUS_DOT_COLORS: Record<string, string> = {
  "new": "bg-gray-400",
  "indeterminate": "bg-orange-400",
  "done": "bg-green-500",
};

interface StoryCardProps {
  story: MissionStory;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function StoryCard({ story }: StoryCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: story.key,
    data: { story },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`rounded-md border bg-white p-2 shadow-sm transition cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-blue-300" : "border-gray-200 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Status dot */}
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_COLORS[story.statusCategory] ?? "bg-red-400"}`}
          title={story.status}
        />

        {/* Summary */}
        <p className="min-w-0 flex-1 text-xs leading-snug text-gray-700 line-clamp-2">
          {story.summary}
        </p>

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
        <span className="font-mono text-[10px] text-gray-400">{story.key.split("-")[1]}</span>
        {story.size && (
          <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">{story.size}</span>
        )}
      </div>
    </div>
  );
}
