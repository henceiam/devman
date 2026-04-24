import { useState, useMemo, useCallback } from "react";
import { DndContext, DragOverlay, useDroppable, type DragEndEvent, type DragStartEvent, closestCenter } from "@dnd-kit/core";
import type { MissionStory, MissionDetail } from "../api/client";
import { api } from "../api/client";
import StoryCard from "./StoryCard";

interface StoryMapGridProps {
  detail: MissionDetail;
  onStoryUpdated: () => void;
}

/** Encode milestone + column into a droppable ID */
function cellId(milestone: string, column: string): string {
  return `${milestone}::${column}`;
}

/** Decode a droppable ID back to milestone + column */
function parseCellId(id: string): { milestone: string; column: string } {
  const sep = id.indexOf("::");
  return { milestone: id.slice(0, sep), column: id.slice(sep + 2) };
}

function milestoneOrder(name: string): number {
  if (name === "No milestone") return -1;
  if (name === "Out of scope") return 100;
  const match = name.match(/^Milestone\s+(\d+)$/i);
  return match ? parseInt(match[1], 10) : 50;
}

function DroppableCell({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded border border-dashed p-1.5 transition ${
        isOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50/50"
      }`}
    >
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

export default function StoryMapGrid({ detail, onStoryUpdated }: StoryMapGridProps) {
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [activeStory, setActiveStory] = useState<MissionStory | null>(null);
  const [localStories, setLocalStories] = useState<MissionStory[] | null>(null);

  const stories = localStories ?? detail.stories;
  const nonRejected = useMemo(
    () => stories.filter((s) => s.status !== "Rejected"),
    [stories],
  );

  const columns = detail.epic.columns;
  const columnNames = useMemo(() => {
    const names = columns.map((c) => c.name);
    // Add "Uncategorized" if any story has no category or a category not in the columns
    const colSet = new Set(names);
    if (nonRejected.some((s) => !s.category || !colSet.has(s.category))) {
      names.push("Uncategorized");
    }
    return names;
  }, [columns, nonRejected]);

  // Group stories into grid cells
  const milestoneRows = useMemo(() => {
    const groups = new Map<string, Map<string, MissionStory[]>>();

    for (const story of nonRejected) {
      const ms = story.milestone ?? "No milestone";
      const col = (story.category && columnNames.includes(story.category))
        ? story.category
        : "Uncategorized";

      if (!groups.has(ms)) groups.set(ms, new Map());
      const row = groups.get(ms)!;
      if (!row.has(col)) row.set(col, []);
      row.get(col)!.push(story);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => milestoneOrder(a) - milestoneOrder(b));
  }, [nonRejected, columnNames]);

  const toggleRow = (ms: string) => {
    setCollapsedRows((prev) => {
      const next = new Set(prev);
      if (next.has(ms)) next.delete(ms);
      else next.add(ms);
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const story = event.active.data.current?.story as MissionStory | undefined;
    setActiveStory(story ?? null);
    // Initialize local stories for optimistic updates
    if (!localStories) setLocalStories([...detail.stories]);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveStory(null);
    const { active, over } = event;
    if (!over) return;

    const storyKey = active.id as string;
    const { milestone, column } = parseCellId(over.id as string);

    const story = (localStories ?? detail.stories).find((s) => s.key === storyKey);
    if (!story) return;

    const newMilestone = milestone === "No milestone" ? null : milestone;
    const newCategory = column === "Uncategorized" ? null : column;

    // Skip if nothing changed
    if (story.milestone === newMilestone && story.category === newCategory) return;

    // Optimistic update
    setLocalStories((prev) =>
      (prev ?? detail.stories).map((s) =>
        s.key === storyKey ? { ...s, milestone: newMilestone, category: newCategory } : s,
      ),
    );

    try {
      await api.missions.updateStory(storyKey, {
        milestone: newMilestone,
        category: newCategory,
      });
      onStoryUpdated();
    } catch (err) {
      // Rollback
      setLocalStories(null);
      console.error("Failed to update story:", err);
    }
  }, [localStories, detail.stories, onStoryUpdated]);

  // Count stories per milestone row for summary
  const rowCounts = useMemo(() => {
    const counts = new Map<string, { total: number; done: number }>();
    for (const [ms, colMap] of milestoneRows) {
      let total = 0;
      let done = 0;
      for (const stories of colMap.values()) {
        total += stories.length;
        done += stories.filter((s) => s.statusCategory === "done").length;
      }
      counts.set(ms, { total, done });
    }
    return counts;
  }, [milestoneRows]);

  if (columnNames.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No story map columns configured for this mission.
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto">
        <div className="inline-grid min-w-full" style={{ gridTemplateColumns: `200px repeat(${columnNames.length}, minmax(180px, 1fr))` }}>
          {/* Header row */}
          <div className="sticky left-0 z-10 bg-gray-50 border-b border-gray-200 p-2" />
          {columnNames.map((col) => (
            <div key={col} className="border-b border-gray-200 bg-gray-50 p-2 text-center text-xs font-semibold text-gray-600">
              {col}
            </div>
          ))}

          {/* Milestone rows */}
          {milestoneRows.map(([ms, colMap]) => {
            const collapsed = collapsedRows.has(ms);
            const counts = rowCounts.get(ms);
            return (
              <div key={ms} className="contents">
                {/* Row header */}
                <button
                  onClick={() => toggleRow(ms)}
                  className="sticky left-0 z-10 flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2 text-left hover:bg-gray-50"
                >
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-700">{ms}</span>
                  {counts && (
                    <span className="text-[10px] text-gray-400">
                      {counts.done}/{counts.total}
                    </span>
                  )}
                </button>

                {/* Cells */}
                {columnNames.map((col) => (
                  <div key={`${ms}::${col}`} className="border-b border-gray-100 p-1">
                    {!collapsed && (
                      <DroppableCell id={cellId(ms, col)}>
                        {(colMap.get(col) ?? []).map((story) => (
                          <StoryCard key={story.key} story={story} />
                        ))}
                      </DroppableCell>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag overlay — renders the card being dragged */}
      <DragOverlay>
        {activeStory && (
          <div className="w-44 rotate-2 opacity-90">
            <StoryCard story={activeStory} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
