import { act, render, screen } from "@testing-library/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { describe, expect, it, vi } from "vitest";
import type { MissionDetail } from "../api/client";
import { makeStory } from "../test/fixtures";
import { projectMilestones } from "./milestoneProjection";
import StoryMapGrid from "./StoryMapGrid";

const droppableData = vi.hoisted(() => new Map<string, unknown>());
const draggableIds = vi.hoisted(() => new Set<string>());
const dragHandlers = vi.hoisted(() => ({
  start: undefined as ((event: DragStartEvent) => void) | undefined,
  end: undefined as ((event: DragEndEvent) => void) | undefined,
  cancel: undefined as (() => void) | undefined,
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...original,
    DndContext: ({ children, onDragStart, onDragEnd, onDragCancel }: {
      children: React.ReactNode;
      onDragStart?: (event: DragStartEvent) => void;
      onDragEnd?: (event: DragEndEvent) => void;
      onDragCancel?: () => void;
    }) => {
      dragHandlers.start = onDragStart;
      dragHandlers.end = onDragEnd;
      dragHandlers.cancel = onDragCancel;
      return children;
    },
    DragOverlay: ({ children }: { children: React.ReactNode }) => children,
    useDroppable: ({ id, data }: { id: string; data: unknown }) => {
      droppableData.set(id, data);
      return { setNodeRef: vi.fn(), isOver: false };
    },
    useDraggable: ({ id }: { id: string }) => {
      draggableIds.add(id);
      return {
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        isDragging: false,
      };
    },
  };
});

const epic: MissionDetail["epic"] = {
  key: "MISSION-A",
  summary: "Mission A",
  shortName: "Mission A",
  status: "In Progress",
  statusCategory: "indeterminate",
  columns: [{ name: "Feature", order: 0 }],
};

describe("StoryMapGrid", () => {
  it("registers valid planning rows as destinations but only permits moving out of unknown rows", () => {
    droppableData.clear();
    draggableIds.clear();
    const rows = projectMilestones({
      stories: [
        makeStory({ key: "NONE", milestone: null, category: "Feature" }),
        makeStory({ key: "USED", milestone: "Milestone 3", category: "Feature" }),
        makeStory({ key: "UNKNOWN", milestone: "Later", category: "Feature" }),
        makeStory({ key: "OUT", milestone: "Out of scope", category: "Feature" }),
      ],
      hideDone: false,
      descriptions: { "Milestone 1": "Described empty milestone" },
    });

    render(<StoryMapGrid
      epic={epic}
      rows={rows}
      collapsedRows={new Set()}
      onToggleRow={vi.fn()}
      onMoveStory={vi.fn()}
      pendingStoryKeys={new Set()}
    />);

    expect(Array.from(droppableData.entries())).toEqual([
      ["__unassigned__::Feature", { milestone: null, column: "Feature" }],
      ["Milestone 1::Feature", { milestone: "Milestone 1", column: "Feature" }],
      ["Milestone 3::Feature", { milestone: "Milestone 3", column: "Feature" }],
      ["Milestone 4::Feature", { milestone: "Milestone 4", column: "Feature" }],
      ["Milestone 5::Feature", { milestone: "Milestone 5", column: "Feature" }],
      ["Out of scope::Feature", { milestone: "Out of scope", column: "Feature" }],
    ]);
    expect(draggableIds).toContain("UNKNOWN");
    expect(screen.getByRole("button", { name: "Later" })).toBeInTheDocument();
  });

  it("does not register collapsed rows as destinations", () => {
    droppableData.clear();
    const rows = projectMilestones({ stories: [], hideDone: false, descriptions: {} });

    render(<StoryMapGrid
      epic={epic}
      rows={rows}
      collapsedRows={new Set(["Milestone 1"])}
      onToggleRow={vi.fn()}
      onMoveStory={vi.fn()}
      pendingStoryKeys={new Set()}
    />);

    expect(droppableData.has("Milestone 1::Feature")).toBe(false);
    expect(droppableData.has("Milestone 2::Feature")).toBe(true);
  });

  it("signals drag start, end, and cancellation to the workspace", async () => {
    const story = makeStory({ key: "DRAG-1", milestone: "Milestone 1", category: "Feature" });
    const onDragActiveChange = vi.fn();
    const rows = projectMilestones({ stories: [story], hideDone: false, descriptions: {} });

    const { unmount } = render(<StoryMapGrid
      epic={epic}
      rows={rows}
      collapsedRows={new Set()}
      onToggleRow={vi.fn()}
      onMoveStory={vi.fn()}
      pendingStoryKeys={new Set()}
      onDragActiveChange={onDragActiveChange}
    />);

    act(() => dragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    await act(async () => dragHandlers.end?.({ active: { id: story.key }, over: null } as DragEndEvent));
    act(() => dragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    act(() => dragHandlers.cancel?.());
    act(() => dragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    unmount();

    expect(onDragActiveChange.mock.calls).toEqual([[true], [false], [true], [false], [true], [false]]);
  });
});
