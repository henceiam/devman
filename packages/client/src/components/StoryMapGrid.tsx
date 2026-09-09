import { useEffect, useState, useMemo } from "react";
import { DndContext, DragOverlay, useDroppable, type DragEndEvent, type DragStartEvent, closestCenter } from "@dnd-kit/core";
import type { MissionStory, MissionDetail } from "../api/client";
import type { MilestoneRow } from "./milestoneProjection";
import StoryCard from "./StoryCard";

interface StoryMapGridProps {
  epic: MissionDetail["epic"];
  rows: MilestoneRow[];
  collapsedRows: ReadonlySet<string>;
  onToggleRow: (rowId: string) => void;
  onMoveStory: (storyKey: string, milestone: string | null, category: string | null) => Promise<void>;
  pendingStoryKeys: ReadonlySet<string>;
  onStorySelect?: (key: string) => void;
  onEditDescription?: (milestoneName: string) => void;
  onDragActiveChange?: (active: boolean) => void;
}

/** Encode milestone + column into a droppable ID */
function cellId(milestone: string, column: string): string {
  return `${milestone}::${column}`;
}

function DroppableCell({ id, milestone, column, children }: { id: string; milestone: string | null; column: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { milestone, column } });
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

export default function StoryMapGrid({ epic, rows, collapsedRows, onToggleRow, onMoveStory, pendingStoryKeys, onStorySelect, onEditDescription, onDragActiveChange }: StoryMapGridProps) {
  const [activeStory, setActiveStory] = useState<MissionStory | null>(null);

  useEffect(() => () => onDragActiveChange?.(false), [onDragActiveChange]);

  const columns = epic.columns;
  const columnNames = useMemo(() => {
    const names = columns.map((c) => c.name);
    // Add "Uncategorized" if any story has no category or a category not in the columns
    const colSet = new Set(names);
    if (rows.some((row) => row.visibleStories.some((s) => !s.category || !colSet.has(s.category)))) {
      names.push("Uncategorized");
    }
    return names;
  }, [columns, rows]);

  // Group stories into grid cells
  const milestoneRows = useMemo(() => rows.map((row) => {
    const cells = new Map<string, MissionStory[]>();
    for (const story of row.visibleStories) {
      const col = (story.category && columnNames.includes(story.category))
        ? story.category
        : "Uncategorized";
      const stories = cells.get(col);
      if (stories) stories.push(story);
      else cells.set(col, [story]);
    }
    return { row, cells };
  }), [rows, columnNames]);

  const handleDragStart = (event: DragStartEvent) => {
    const story = event.active.data.current?.story as MissionStory | undefined;
    setActiveStory(story ?? null);
    onDragActiveChange?.(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveStory(null);
    onDragActiveChange?.(false);
    const { active, over } = event;
    if (!over) return;

    const storyKey = active.id as string;
    const destination = over.data.current as { milestone: string | null; column: string } | undefined;
    if (!destination) return;

    const story = rows.flatMap((row) => row.visibleStories).find((s) => s.key === storyKey);
    if (!story) return;

    const newMilestone = destination.milestone;
    const newCategory = destination.column === "Uncategorized" ? null : destination.column;

    // Skip if nothing changed
    if (story.milestone === newMilestone && story.category === newCategory) return;

    await onMoveStory(storyKey, newMilestone, newCategory);
  };

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
      onDragCancel={() => {
        setActiveStory(null);
        onDragActiveChange?.(false);
      }}
    >
      <div className="overflow-x-auto">
        <div className="inline-grid min-w-full" style={{ gridTemplateColumns: `140px repeat(${columnNames.length}, minmax(180px, 1fr))` }}>
          {/* Header row */}
          <div className="sticky left-0 z-10 bg-gray-50 border-b border-gray-200 p-2" />
          {columnNames.map((col) => (
            <div key={col} className="border-b border-gray-200 bg-gray-50 p-2 text-center text-xs font-semibold text-gray-600">
              {col}
            </div>
          ))}

          {/* Milestone rows */}
          {milestoneRows.map(({ row, cells }) => {
            const collapsed = collapsedRows.has(row.id);
            const counts = row.statusCounts;
            const isSpecial = row.kind === "unassigned" || row.kind === "out-of-scope";
            return (
              <div key={row.id} className="contents">
                {/* Row header */}
                <div
                  className={`sticky left-0 z-10 flex items-start gap-2 border-b border-gray-100 px-3 py-2 text-left ${
                    isSpecial
                      ? "bg-orange-50 hover:bg-orange-100"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <button
                    onClick={() => onToggleRow(row.id)}
                    aria-expanded={!collapsed}
                    aria-label={row.displayName}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  >
                  <svg
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{row.displayName}</span>
                    </div>
                    {row.description && (
                      <p className="text-[10px] italic text-gray-500 whitespace-normal leading-tight">{row.description}</p>
                    )}
                    {counts && counts.total > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100">
                          {counts.done > 0 && <div className="bg-green-500" style={{ width: `${(counts.done / counts.total) * 100}%` }} />}
                          {counts.inProgress > 0 && <div className="bg-orange-400" style={{ width: `${(counts.inProgress / counts.total) * 100}%` }} />}
                          {counts.toDo > 0 && <div className="bg-gray-300" style={{ width: `${(counts.toDo / counts.total) * 100}%` }} />}
                        </div>
                        <span className="text-[10px] text-gray-400">{counts.done}/{counts.total}</span>
                      </div>
                    )}
                  </div>
                  </button>
                  {row.descriptionEditable && onEditDescription && (
                    <button
                      onClick={() => onEditDescription(row.displayName)}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Edit milestone description"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Cells */}
                {columnNames.map((col) => (
                  <div key={`${row.id}::${col}`} className={`border-b border-gray-100 p-1 ${
                    isSpecial ? "bg-orange-50" : ""
                  }`}>
                    {!collapsed && (
                      row.dropEligible ? <DroppableCell id={cellId(row.id, col)} milestone={row.milestoneValue} column={col}>
                        {(cells.get(col) ?? []).map((story) => (
                          <StoryCard key={story.key} story={story} onSelect={onStorySelect} dragDisabled={pendingStoryKeys.has(story.key)} />
                        ))}
                      </DroppableCell> : <div className="min-h-[80px] rounded border border-gray-200 bg-gray-50/50 p-1.5">
                        {(cells.get(col) ?? []).map((story) => <StoryCard key={story.key} story={story} onSelect={onStorySelect} dragDisabled={pendingStoryKeys.has(story.key)} />)}
                      </div>
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
