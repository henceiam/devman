import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, type MissionDetail } from "../api/client";
import { makeStory } from "../test/fixtures";
import MilestoneWorkspace, { rowsForWorkspace } from "./MilestoneWorkspace";
import { projectMilestones } from "./milestoneProjection";

const dragHandlers = vi.hoisted(() => ({
  start: undefined as ((event: DragStartEvent) => void) | undefined,
  end: undefined as ((event: DragEndEvent) => void) | undefined,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function move(storyKey: string, story: MissionDetail["stories"][number], milestone = "Milestone 2") {
  act(() => dragHandlers.start?.({
    active: { id: storyKey, data: { current: { story } } },
  } as unknown as DragStartEvent));
  await act(async () => dragHandlers.end?.({
    active: { id: storyKey },
    over: { data: { current: { milestone, column: "Feature" } } },
  } as unknown as DragEndEvent));
}

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...original,
    DndContext: ({ children, onDragStart, onDragEnd }: {
      children: React.ReactNode;
      onDragStart?: (event: DragStartEvent) => void;
      onDragEnd?: (event: DragEndEvent) => void;
    }) => {
      dragHandlers.start = onDragStart;
      dragHandlers.end = onDragEnd;
      return children;
    },
    DragOverlay: ({ children }: { children: React.ReactNode }) => children,
    useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    }),
  };
});

function detail(key: string): MissionDetail {
  return {
    epic: {
      key,
      summary: `${key} summary`,
      shortName: key,
      status: "In Progress",
      statusCategory: "indeterminate",
      columns: [{ name: "Feature", order: 0 }],
    },
    stories: [
      makeStory({ key: `${key}-1`, milestone: "Milestone 1" }),
      makeStory({ key: `${key}-2`, milestone: "Out of scope" }),
    ],
  };
}

const defaultProps = {
  hideDone: false,
  focusMode: false,
  descriptions: {},
  onStorySelect: vi.fn(),
  onStoryUpdated: vi.fn(async () => detail("MISSION-A")),
  onEditDescription: vi.fn(),
};

describe("MilestoneWorkspace", () => {
  afterEach(() => vi.restoreAllMocks());

  it("filters only presentation rows in Focus mode", () => {
    const rows = projectMilestones({
      stories: [
        makeStory({ key: "VISIBLE", milestone: "Milestone 1" }),
        makeStory({ key: "DONE", milestone: "Milestone 2", statusCategory: "done" }),
      ],
      hideDone: true,
      descriptions: { "Milestone 3": "Future intent" },
    });

    expect(rowsForWorkspace(rows, false).map((row) => row.displayName)).toEqual([
      "Milestone 1", "Milestone 2", "Milestone 3", "Milestone 4",
    ]);
    expect(rowsForWorkspace(rows, true).map((row) => row.displayName)).toEqual(["Milestone 1"]);
    expect(rows.find((row) => row.id === "Milestone 2")?.statusCounts).toMatchObject({ total: 1, done: 1 });
  });

  it("keeps independent List and Story Map collapse choices across view switches", () => {
    const { rerender } = render(
      <MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="list" />,
    );

    const listRow = screen.getByRole("button", { name: "Milestone 1" });
    expect(listRow).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(listRow);
    expect(listRow).toHaveAttribute("aria-expanded", "true");

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="map" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Out of scope" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="list" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "true");

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="map" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "false");
  });

  it("resets both collapse maps when the selected Mission changes", () => {
    const { rerender } = render(
      <MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="list" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="map" />);
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-B")} viewMode="list" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "false");

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-B")} viewMode="map" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps complete List progress when the Done card filter hides every story", () => {
    const doneDetail = detail("MISSION-A");
    doneDetail.stories = [makeStory({
      key: "MISSION-A-DONE",
      milestone: "Milestone 1",
      statusCategory: "done",
    })];

    render(
      <MilestoneWorkspace {...defaultProps} detail={doneDetail} viewMode="list" hideDone />,
    );

    expect(screen.getByText("1 story")).toBeInTheDocument();
    expect(screen.getByText("1 done")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));
    expect(screen.getByText("No stories yet")).toBeInTheDocument();
  });

  it("shows an expanded empty planning row without progress", () => {
    const emptyDetail = detail("MISSION-A");
    emptyDetail.stories = [];

    render(
      <MilestoneWorkspace {...defaultProps} detail={emptyDetail} viewMode="list" />,
    );

    expect(screen.queryByText(/stories?$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/done$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));
    expect(screen.getByText("No stories yet")).toBeInTheDocument();
  });

  it.each(["list", "map"] as const)("shows the same active rows and descriptions in Focus %s view", (viewMode) => {
    const focusDetail = detail("MISSION-A");
    focusDetail.stories = [
      makeStory({ key: "VISIBLE", summary: "Visible story", milestone: "Milestone 1" }),
      makeStory({ key: "DONE", summary: "Hidden done story", milestone: "Milestone 2", statusCategory: "done" }),
    ];

    render(<MilestoneWorkspace
      {...defaultProps}
      detail={focusDetail}
      viewMode={viewMode}
      hideDone
      focusMode
      descriptions={{ "Milestone 1": "Retained context", "Milestone 3": "Empty context" }}
      onEditDescription={undefined}
    />);

    expect(screen.getByRole("button", { name: "Milestone 1" })).toBeInTheDocument();
    expect(screen.getByText("Retained context")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Milestone 2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Milestone 3" })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Edit milestone description")).not.toBeInTheDocument();
  });

  it("preserves each view's collapse choice while a row temporarily disappears in Focus mode", () => {
    const focusDetail = detail("MISSION-A");
    focusDetail.stories = [makeStory({ key: "DONE", milestone: "Milestone 1", statusCategory: "done" })];
    const { rerender } = render(
      <MilestoneWorkspace {...defaultProps} detail={focusDetail} viewMode="list" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));

    rerender(<MilestoneWorkspace {...defaultProps} detail={focusDetail} viewMode="map" />);
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));

    rerender(<MilestoneWorkspace {...defaultProps} detail={focusDetail} viewMode="list" hideDone focusMode />);
    expect(screen.queryByRole("button", { name: "Milestone 1" })).not.toBeInTheDocument();

    rerender(<MilestoneWorkspace {...defaultProps} detail={focusDetail} viewMode="list" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "true");

    rerender(<MilestoneWorkspace {...defaultProps} detail={focusDetail} viewMode="map" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "false");
  });

  it("removes a Focus source row immediately after its last visible story moves", () => {
    vi.spyOn(api.missions, "updateStory").mockReturnValue(new Promise(() => {}));
    const focusDetail = detail("MISSION-A");
    focusDetail.stories = [makeStory({ key: "MOVE", milestone: "Milestone 1", category: "Feature" })];

    render(<MilestoneWorkspace {...defaultProps} detail={focusDetail} viewMode="map" focusMode />);

    act(() => dragHandlers.start?.({
      active: { id: "MOVE", data: { current: { story: focusDetail.stories[0] } } },
    } as unknown as DragStartEvent));
    act(() => {
      void dragHandlers.end?.({
        active: { id: "MOVE" },
        over: { data: { current: { milestone: "Milestone 2", column: "Feature" } } },
      } as unknown as DragEndEvent);
    });

    expect(screen.queryByRole("button", { name: "Milestone 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Milestone 2" })).toBeInTheDocument();
    expect(screen.getByText("Test story")).toBeInTheDocument();
  });

  it("prevents a second move while persistence is pending", async () => {
    const persistence = deferred<void>();
    const updateStory = vi.spyOn(api.missions, "updateStory").mockReturnValue(persistence.promise);
    const mission = detail("MISSION-A");
    render(<MilestoneWorkspace {...defaultProps} detail={mission} viewMode="map" />);

    void move("MISSION-A-1", mission.stories[0]);
    await move("MISSION-A-1", mission.stories[0], "Milestone 3");

    expect(updateStory).toHaveBeenCalledTimes(1);
    expect(updateStory).toHaveBeenCalledWith("MISSION-A-1", { milestone: "Milestone 2", category: "Feature" });
    await act(async () => persistence.resolve());
  });

  it("rolls back a failed persistence request and shows its error", async () => {
    vi.spyOn(api.missions, "updateStory").mockRejectedValue(new Error("Jira rejected the move"));
    const mission = detail("MISSION-A");
    render(<MilestoneWorkspace {...defaultProps} detail={mission} viewMode="map" focusMode />);

    await move("MISSION-A-1", mission.stories[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Jira rejected the move");
    expect(screen.getByRole("button", { name: "Milestone 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Milestone 2" })).not.toBeInTheDocument();
  });

  it("retains a persisted move and shows a non-blocking refresh error", async () => {
    vi.spyOn(api.missions, "updateStory").mockResolvedValue(undefined);
    const mission = detail("MISSION-A");
    render(<MilestoneWorkspace
      {...defaultProps}
      detail={mission}
      viewMode="map"
      focusMode
      onStoryUpdated={vi.fn().mockRejectedValue(new Error("offline"))}
    />);

    await move("MISSION-A-1", mission.stories[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Story moved, but Mission data could not be refreshed.");
    expect(screen.queryByRole("button", { name: "Milestone 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Milestone 2" })).toBeInTheDocument();
  });

  it("uses refreshed server data after successful persistence", async () => {
    vi.spyOn(api.missions, "updateStory").mockResolvedValue(undefined);
    const mission = detail("MISSION-A");
    const refreshed = detail("MISSION-A");
    refreshed.stories[0] = makeStory({ key: "MISSION-A-1", milestone: "Milestone 3", category: "Feature" });
    render(<MilestoneWorkspace
      {...defaultProps}
      detail={mission}
      viewMode="map"
      focusMode
      onStoryUpdated={vi.fn().mockResolvedValue(refreshed)}
    />);

    await move("MISSION-A-1", mission.stories[0]);

    await waitFor(() => expect(screen.getByRole("button", { name: "Milestone 3" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Milestone 2" })).not.toBeInTheDocument();
  });

  it("ignores a stale move failure after the selected Mission changes", async () => {
    const persistence = deferred<void>();
    const updateStory = vi.spyOn(api.missions, "updateStory").mockReturnValue(persistence.promise);
    const firstMission = detail("MISSION-A");
    const { rerender } = render(<MilestoneWorkspace {...defaultProps} detail={firstMission} viewMode="map" />);
    act(() => dragHandlers.start?.({
      active: { id: "MISSION-A-1", data: { current: { story: firstMission.stories[0] } } },
    } as unknown as DragStartEvent));
    act(() => {
      void dragHandlers.end?.({
        active: { id: "MISSION-A-1" },
        over: { data: { current: { milestone: "Milestone 2", column: "Feature" } } },
      } as unknown as DragEndEvent);
    });
    await waitFor(() => expect(updateStory).toHaveBeenCalledTimes(1));

    const secondMission = detail("MISSION-B");
    secondMission.stories[0] = { ...secondMission.stories[0], summary: "Second Mission story" };
    rerender(<MilestoneWorkspace {...defaultProps} detail={secondMission} viewMode="map" />);
    await act(async () => persistence.reject(new Error("Old Mission failed")));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Second Mission story")).toBeInTheDocument();
  });
});
