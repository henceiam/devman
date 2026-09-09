import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MissionDetail } from "../api/client";
import { makeStory } from "../test/fixtures";
import { projectMilestones } from "./milestoneProjection";
import StoryMapGrid from "./StoryMapGrid";

const droppableData = vi.hoisted(() => new Map<string, unknown>());
const draggableIds = vi.hoisted(() => new Set<string>());

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...original,
    DndContext: ({ children }: { children: React.ReactNode }) => children,
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
});
