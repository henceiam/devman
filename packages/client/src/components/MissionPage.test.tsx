import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { StrictMode } from "react";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppContent } from "../App";
import { AppChromeProvider, useAppChromeState } from "../AppChrome";
import { api, type MissionDetail, type MissionSummary } from "../api/client";
import { makeStory } from "../test/fixtures";
import MissionPage from "./MissionPage";

const missionDragHandlers = vi.hoisted(() => ({
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
      missionDragHandlers.start = onDragStart;
      missionDragHandlers.end = onDragEnd;
      missionDragHandlers.cancel = onDragCancel;
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

function mission(key: string, shortName = `${key} short`): MissionDetail {
  return {
    epic: {
      key,
      summary: `${key} full summary`,
      shortName,
      status: "In Progress",
      statusCategory: "indeterminate",
      columns: [{ name: "Feature", order: 0 }],
    },
    stories: [makeStory({ key: `${key}-1`, summary: `${key} story`, milestone: "Milestone 1" })],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createMediaQuery(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    media: "(min-width: 1024px)",
    get matches() { return matches; },
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    get listenerCount() { return listeners.size; },
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener({ matches: next, media: mediaQuery.media } as MediaQueryListEvent));
    },
  };
  return mediaQuery;
}

function GlobalHeader() {
  const { headerHidden } = useAppChromeState();
  return headerHidden ? null : <header>DevMan global header</header>;
}

function renderMission(initialPath = "/missions/MISSION-A") {
  const router = createMemoryRouter([
    { path: "/missions/:missionKey?", element: <MissionPage /> },
    { path: "/support", element: <main>Support route</main> },
  ], { initialEntries: [initialPath] });

  render(
    <StrictMode>
      <AppChromeProvider>
        <GlobalHeader />
        <RouterProvider router={router} />
      </AppChromeProvider>
    </StrictMode>,
  );
  return router;
}

const summaries: MissionSummary[] = [mission("MISSION-A").epic, mission("MISSION-B").epic];

describe("Mission Focus mode", () => {
  let mediaQuery: ReturnType<typeof createMediaQuery>;

  beforeEach(() => {
    mediaQuery = createMediaQuery(true);
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));
    vi.spyOn(api.missions, "list").mockResolvedValue({ missions: summaries });
    vi.spyOn(api.missions, "getMilestoneSummaries").mockResolvedValue({ summaries: { "Milestone 1": "Ship the core workflow" } });
    vi.spyOn(api.missions, "getDetail").mockImplementation(async (key) => mission(key));
  });

  afterEach(() => vi.restoreAllMocks());

  it("disables desktop entry until valid Mission detail has loaded", async () => {
    const detailRequest = deferred<MissionDetail>();
    vi.mocked(api.missions.getDetail).mockReturnValue(detailRequest.promise);

    renderMission();

    const entry = screen.getByRole("button", { name: "Enter Focus mode" });
    expect(entry).toBeDisabled();
    expect(entry).toHaveAccessibleDescription("Available after Mission details load.");

    await act(async () => detailRequest.resolve(mission("MISSION-A")));
    await waitFor(() => expect(entry).toBeEnabled());
  });

  it("suppresses global and Mission chrome while retaining the command bar and workspace", async () => {
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());

    fireEvent.click(entry);

    expect(entry).toHaveAttribute("aria-keyshortcuts", "Z");
    expect(await screen.findByRole("button", { name: "Exit Focus mode" })).toHaveAttribute("aria-keyshortcuts", "Z");
    expect(screen.getByRole("button", { name: "Exit Focus mode" })).toHaveAccessibleName("Exit Focus mode");
    expect(screen.queryByText("DevMan global header")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mission")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit categories" })).not.toBeInTheDocument();
    expect(screen.queryByText("Size Distribution")).not.toBeInTheDocument();
    expect(screen.queryByText("refresh")).not.toBeInTheDocument();
    expect(screen.getByText("MISSION-A short")).toBeInTheDocument();
    expect(screen.getByText("Done hidden")).toBeInTheDocument();
    expect(screen.getByText("Ship the core workflow")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit description" })).not.toBeInTheDocument();
    expect(screen.getByText("MISSION-A story")).toBeInTheDocument();
  });

  it("preserves workspace collapse state across Focus transitions", async () => {
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    const milestone = screen.getByRole("button", { name: "Milestone 1" });
    fireEvent.click(milestone);
    expect(milestone).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(entry);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Exit Focus mode" }));
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps an optimistic move mounted and locked during manual refresh", async () => {
    const persistence = deferred<void>();
    const refresh = deferred<MissionDetail>();
    const updateStory = vi.spyOn(api.missions, "updateStory").mockReturnValue(persistence.promise);
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(entry);

    const story = mission("MISSION-A").stories[0];
    act(() => missionDragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    act(() => {
      void missionDragHandlers.end?.({
        active: { id: story.key },
        over: { data: { current: { milestone: "Milestone 2", column: "Feature" } } },
      } as unknown as DragEndEvent);
    });
    await waitFor(() => expect(updateStory).toHaveBeenCalledTimes(1));

    vi.mocked(api.missions.getDetail).mockReturnValue(refresh.promise);
    fireEvent.keyDown(window, { key: "r" });
    expect(screen.getByText("Loading mission details…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Milestone 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Milestone 2" })).toBeInTheDocument();

    act(() => missionDragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    await act(async () => missionDragHandlers.end?.({
      active: { id: story.key },
      over: { data: { current: { milestone: "Milestone 3", column: "Feature" } } },
    } as unknown as DragEndEvent));
    expect(updateStory).toHaveBeenCalledTimes(1);

    await act(async () => refresh.resolve(mission("MISSION-A")));
    await act(async () => persistence.resolve());
  });

  it("ignores an older manual refresh after the post-move refresh succeeds", async () => {
    const persistence = deferred<void>();
    const manualRefresh = deferred<MissionDetail>();
    const postMoveRefresh = deferred<MissionDetail>();
    const updateStory = vi.spyOn(api.missions, "updateStory").mockReturnValue(persistence.promise);
    renderMission();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Enter Focus mode" }));
    const initialDetailRequests = vi.mocked(api.missions.getDetail).mock.calls.length;
    vi.mocked(api.missions.getDetail)
      .mockReturnValueOnce(manualRefresh.promise)
      .mockReturnValueOnce(postMoveRefresh.promise);

    const story = mission("MISSION-A").stories[0];
    act(() => missionDragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    act(() => {
      void missionDragHandlers.end?.({
        active: { id: story.key },
        over: { data: { current: { milestone: "Milestone 2", column: "Feature" } } },
      } as unknown as DragEndEvent);
    });
    await waitFor(() => expect(updateStory).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(window, { key: "r" });
    await act(async () => persistence.resolve());
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 2));

    const movedMission = mission("MISSION-A");
    movedMission.stories[0] = makeStory({
      key: "MISSION-A-1",
      summary: "MISSION-A story",
      milestone: "Milestone 2",
      category: "Feature",
    });
    await act(async () => postMoveRefresh.resolve(movedMission));
    expect(screen.getByRole("button", { name: "Milestone 2" })).toBeInTheDocument();

    await act(async () => manualRefresh.resolve(mission("MISSION-A")));
    expect(screen.getByRole("button", { name: "Milestone 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Milestone 1" })).not.toBeInTheDocument();
  });

  it("does not report a superseded post-move refresh as a move failure", async () => {
    const persistence = deferred<void>();
    const postMoveRefresh = deferred<MissionDetail>();
    const manualRefresh = deferred<MissionDetail>();
    const updateStory = vi.spyOn(api.missions, "updateStory").mockReturnValue(persistence.promise);
    renderMission();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Enter Focus mode" }));
    const initialDetailRequests = vi.mocked(api.missions.getDetail).mock.calls.length;
    vi.mocked(api.missions.getDetail)
      .mockReturnValueOnce(postMoveRefresh.promise)
      .mockReturnValueOnce(manualRefresh.promise);

    const story = mission("MISSION-A").stories[0];
    act(() => missionDragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    act(() => {
      void missionDragHandlers.end?.({
        active: { id: story.key },
        over: { data: { current: { milestone: "Milestone 2", column: "Feature" } } },
      } as unknown as DragEndEvent);
    });
    await waitFor(() => expect(updateStory).toHaveBeenCalledTimes(1));

    await act(async () => persistence.resolve());
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 1));
    fireEvent.keyDown(window, { key: "r" });
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 2));

    const latestMission = mission("MISSION-A");
    latestMission.stories[0] = makeStory({
      key: "MISSION-A-1",
      summary: "MISSION-A story",
      milestone: "Milestone 2",
      category: "Feature",
    });
    await act(async () => manualRefresh.resolve(latestMission));
    await act(async () => postMoveRefresh.resolve(mission("MISSION-A")));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Milestone 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Milestone 1" })).not.toBeInTheDocument();
  });

  it("applies a newer canonical manual refresh after its superseded move refresh settles", async () => {
    const persistence = deferred<void>();
    const postMoveRefresh = deferred<MissionDetail>();
    const manualRefresh = deferred<MissionDetail>();
    vi.spyOn(api.missions, "updateStory").mockReturnValue(persistence.promise);
    renderMission();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeEnabled());
    const initialDetailRequests = vi.mocked(api.missions.getDetail).mock.calls.length;
    vi.mocked(api.missions.getDetail)
      .mockReturnValueOnce(postMoveRefresh.promise)
      .mockReturnValueOnce(manualRefresh.promise);

    const story = mission("MISSION-A").stories[0];
    act(() => missionDragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    act(() => {
      void missionDragHandlers.end?.({
        active: { id: story.key },
        over: { data: { current: { milestone: "Milestone 2", column: "Feature" } } },
      } as unknown as DragEndEvent);
    });
    await act(async () => persistence.resolve());
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 1));
    fireEvent.keyDown(window, { key: "r" });
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 2));

    const canonicalMission = mission("MISSION-A");
    canonicalMission.stories[0] = makeStory({
      key: "MISSION-A-1",
      summary: "MISSION-A story",
      milestone: "Milestone 3",
      category: "Feature",
    });
    await act(async () => manualRefresh.resolve(canonicalMission));
    expect(screen.getByRole("button", { name: "Milestone 2" })).toBeInTheDocument();

    const optimisticMission = mission("MISSION-A");
    optimisticMission.stories[0] = makeStory({
      key: "MISSION-A-1",
      summary: "MISSION-A story",
      milestone: "Milestone 2",
      category: "Feature",
    });
    await act(async () => postMoveRefresh.resolve(optimisticMission));

    expect(screen.getByRole("button", { name: "Milestone 3" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Milestone 2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retains a later confirmed move when an earlier move snapshot queued before its failed refresh", async () => {
    const initialMission = mission("MISSION-A");
    initialMission.stories = [
      makeStory({ key: "STORY-A", summary: "Story A", milestone: "Milestone 1" }),
      makeStory({ key: "STORY-B", summary: "Story B", milestone: "Milestone 1" }),
    ];
    vi.mocked(api.missions.getDetail).mockResolvedValue(initialMission);
    const persistenceA = deferred<void>();
    const persistenceB = deferred<void>();
    const refreshA = deferred<MissionDetail>();
    const refreshB = deferred<MissionDetail>();
    vi.spyOn(api.missions, "updateStory").mockImplementation((storyKey) => (
      storyKey === "STORY-A" ? persistenceA.promise : persistenceB.promise
    ));
    renderMission();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeEnabled());
    const initialDetailRequests = vi.mocked(api.missions.getDetail).mock.calls.length;
    vi.mocked(api.missions.getDetail)
      .mockReturnValueOnce(refreshA.promise)
      .mockReturnValueOnce(refreshB.promise);

    for (const story of initialMission.stories) {
      act(() => missionDragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
      act(() => {
        void missionDragHandlers.end?.({
          active: { id: story.key },
          over: { data: { current: { milestone: "Milestone 2", column: "Feature" } } },
        } as unknown as DragEndEvent);
      });
    }

    await act(async () => persistenceA.resolve());
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 1));
    const canonicalBeforeB = mission("MISSION-A");
    canonicalBeforeB.stories = [
      makeStory({ key: "STORY-A", summary: "Story A", milestone: "Milestone 2", category: "Feature" }),
      makeStory({ key: "STORY-B", summary: "Story B", milestone: "Milestone 1" }),
    ];
    await act(async () => refreshA.resolve(canonicalBeforeB));

    await act(async () => persistenceB.resolve());
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 2));
    await act(async () => refreshB.reject(new Error("Refresh failed")));

    expect(screen.getByText("Story A")).toBeInTheDocument();
    expect(screen.getByText("Story B")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Milestone 2" })).toHaveLength(1);
    expect(screen.getByText("0/2")).toBeInTheDocument();
    expect(screen.queryByText("0/1")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Story moved, but Mission data could not be refreshed.");
  });

  it("does not let a move from an unmounted workspace supersede the selected Mission load", async () => {
    const persistence = deferred<void>();
    const missionBRequest = deferred<MissionDetail>();
    const updateStory = vi.spyOn(api.missions, "updateStory").mockReturnValue(persistence.promise);
    vi.mocked(api.missions.getDetail).mockImplementation((key) => key === "MISSION-B"
      ? missionBRequest.promise
      : Promise.resolve(mission(key)));
    const router = renderMission();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeEnabled());
    const initialDetailRequests = vi.mocked(api.missions.getDetail).mock.calls.length;

    const story = mission("MISSION-A").stories[0];
    act(() => missionDragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    act(() => {
      void missionDragHandlers.end?.({
        active: { id: story.key },
        over: { data: { current: { milestone: "Milestone 2", column: "Feature" } } },
      } as unknown as DragEndEvent);
    });
    await waitFor(() => expect(updateStory).toHaveBeenCalledTimes(1));

    await act(async () => router.navigate("/missions/MISSION-B"));
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 1));
    await act(async () => persistence.resolve());

    expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 1);
    expect(api.missions.getDetail).toHaveBeenLastCalledWith("MISSION-B");
    await act(async () => missionBRequest.resolve(mission("MISSION-B")));
    expect(await screen.findByRole("heading", { name: "MISSION-B full summary" })).toBeInTheDocument();
  });

  it("does not report a stale rejected post-move refresh as a move failure", async () => {
    const persistence = deferred<void>();
    const postMoveRefresh = deferred<MissionDetail>();
    const manualRefresh = deferred<MissionDetail>();
    vi.spyOn(api.missions, "updateStory").mockReturnValue(persistence.promise);
    renderMission();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeEnabled());
    const initialDetailRequests = vi.mocked(api.missions.getDetail).mock.calls.length;
    vi.mocked(api.missions.getDetail)
      .mockReturnValueOnce(postMoveRefresh.promise)
      .mockReturnValueOnce(manualRefresh.promise);

    const story = mission("MISSION-A").stories[0];
    act(() => missionDragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    act(() => {
      void missionDragHandlers.end?.({
        active: { id: story.key },
        over: { data: { current: { milestone: "Milestone 2", column: "Feature" } } },
      } as unknown as DragEndEvent);
    });
    await act(async () => persistence.resolve());
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 1));

    fireEvent.keyDown(window, { key: "r" });
    await waitFor(() => expect(api.missions.getDetail).toHaveBeenCalledTimes(initialDetailRequests + 2));
    await act(async () => postMoveRefresh.reject(new Error("Stale refresh failed")));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const latestMission = mission("MISSION-A");
    latestMission.stories[0] = makeStory({
      key: "MISSION-A-1",
      summary: "MISSION-A story",
      milestone: "Milestone 2",
      category: "Feature",
    });
    await act(async () => manualRefresh.resolve(latestMission));
    expect(screen.getByRole("button", { name: "Milestone 2" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps Focus active across view and Mission switches, including replacement loading", async () => {
    const missionBRequest = deferred<MissionDetail>();
    vi.mocked(api.missions.getDetail).mockImplementation((key) => key === "MISSION-B" ? missionBRequest.promise : Promise.resolve(mission(key)));
    const router = renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(entry);

    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByRole("button", { name: "Exit Focus mode" })).toBeInTheDocument();

    await act(async () => router.navigate("/missions/MISSION-B"));
    expect(screen.getByRole("button", { name: "Exit Focus mode" })).toBeInTheDocument();
    expect(screen.getByText("MISSION-A short")).toBeInTheDocument();
    expect(screen.getByText("Loading mission details…")).toBeInTheDocument();

    await act(async () => missionBRequest.resolve(mission("MISSION-B")));
    expect(await screen.findByText("MISSION-B short")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit Focus mode" })).toBeInTheDocument();
  });

  it("commits replacement detail without waiting for its milestone descriptions", async () => {
    const missionBRequest = deferred<MissionDetail>();
    const missionBSummaries = deferred<{ summaries: Record<string, string> }>();
    vi.mocked(api.missions.getDetail).mockImplementation((key) => key === "MISSION-B"
      ? missionBRequest.promise
      : Promise.resolve(mission(key)));
    vi.mocked(api.missions.getMilestoneSummaries).mockImplementation((key) => key === "MISSION-B"
      ? missionBSummaries.promise
      : Promise.resolve({ summaries: { "Milestone 1": "Ship the core workflow" } }));
    const router = renderMission();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeEnabled());

    await act(async () => router.navigate("/missions/MISSION-B"));
    expect(screen.getByText("Loading mission details…")).toBeInTheDocument();
    await act(async () => missionBRequest.resolve(mission("MISSION-B")));

    expect(screen.getByRole("heading", { name: "MISSION-B full summary" })).toBeInTheDocument();
    expect(screen.queryByText("Loading mission details…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeEnabled();
    expect(screen.queryByText("B description arrived")).not.toBeInTheDocument();

    await act(async () => missionBSummaries.resolve({ summaries: { "Milestone 1": "B description arrived" } }));
    expect(screen.getByText("B description arrived")).toBeInTheDocument();
  });

  it("keeps Focus available when replacement loading fails but valid detail remains", async () => {
    vi.mocked(api.missions.getDetail).mockImplementation((key) => key === "MISSION-B"
      ? Promise.reject(new Error("Replacement failed"))
      : Promise.resolve(mission(key)));
    const router = renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(entry);

    await act(async () => router.navigate("/missions/MISSION-B"));

    expect(await screen.findByText("Replacement failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit Focus mode" })).toBeInTheDocument();
    expect(screen.getByText("MISSION-A short")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Exit Focus mode" }));
    expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Edit description" })).not.toBeInTheDocument();
  });

  it("allows deliberate Focus exit during replacement loading and restores the entry control", async () => {
    const missionBRequest = deferred<MissionDetail>();
    vi.mocked(api.missions.getDetail).mockImplementation((key) => key === "MISSION-B" ? missionBRequest.promise : Promise.resolve(mission(key)));
    const router = renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(entry);

    await act(async () => router.navigate("/missions/MISSION-B"));
    fireEvent.keyDown(window, { key: "z" });

    expect(screen.queryByRole("button", { name: "Exit Focus mode" })).not.toBeInTheDocument();
    await act(async () => missionBRequest.resolve(mission("MISSION-B")));
    expect(screen.getByRole("button", { name: "Enter Focus mode" })).toHaveFocus();
  });

  it("exits below 1024px without restoring Focus when the viewport grows", async () => {
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(entry);

    act(() => mediaQuery.setMatches(false));
    expect(screen.queryByRole("button", { name: "Exit Focus mode" })).not.toBeInTheDocument();
    expect(screen.getByText("DevMan global header")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enter Focus mode" })).not.toBeInTheDocument();

    act(() => mediaQuery.setMatches(true));
    expect(screen.queryByRole("button", { name: "Exit Focus mode" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter Focus mode" })).toBeEnabled();
  });

  it("toggles Focus once per eligible Z key and moves focus with deliberate transitions", async () => {
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());

    fireEvent.keyDown(window, { key: "Z", shiftKey: true });
    const focusHeading = screen.getByRole("heading", { name: /MISSION-A short/ });
    expect(focusHeading).toHaveFocus();

    fireEvent.keyDown(window, { key: "z" });
    expect(screen.getByRole("button", { name: "Enter Focus mode" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Exit Focus mode" })).not.toBeInTheDocument();
  });

  it("keeps one media-query and keyboard effect under Strict Mode", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    renderMission();
    await screen.findByRole("button", { name: "Enter Focus mode" });

    expect(mediaQuery.listenerCount).toBe(1);
    expect(addSpy.mock.calls.filter(([type]) => type === "keydown").length).toBe(2);
    expect(removeSpy.mock.calls.filter(([type]) => type === "keydown").length).toBe(1);
  });

  it("ignores prevented, repeating, modified, and editable-target Mission shortcuts", async () => {
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());

    fireEvent.keyDown(window, { key: "z", repeat: true });
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    const prevented = new KeyboardEvent("keydown", { key: "z", cancelable: true });
    prevented.preventDefault();
    window.dispatchEvent(prevented);
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const child = document.createElement("span");
    editable.append(child);
    document.body.append(editable);
    fireEvent.keyDown(child, { key: "z" });

    expect(screen.queryByRole("button", { name: "Exit Focus mode" })).not.toBeInTheDocument();
  });

  it("suppresses Mission shortcuts while a modal is open and Escape only closes the modal", async () => {
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Edit categories" }));
    expect(screen.getByRole("heading", { name: "Edit Categories" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "z" });
    fireEvent.keyDown(window, { key: "d" });
    fireEvent.keyDown(window, { key: "r" });
    expect(screen.queryByRole("button", { name: "Exit Focus mode" })).not.toBeInTheDocument();
    expect(screen.getByText("Done hidden")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.queryByRole("heading", { name: "Edit Categories" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exit Focus mode" })).not.toBeInTheDocument();
  });

  it("closes Story detail with Escape without leaving Focus mode", async () => {
    vi.spyOn(api.missions, "getStoryDetail").mockReturnValue(new Promise(() => {}));
    vi.spyOn(api.missions, "getStoryComments").mockReturnValue(new Promise(() => {}));
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(entry);
    const story = screen.getByText("MISSION-A story");
    fireEvent.pointerDown(story, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(story, { clientX: 10, clientY: 10 });
    expect(screen.getByRole("heading", { name: "Loading…" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("heading", { name: "Loading…" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit Focus mode" })).toBeInTheDocument();
  });

  it("keeps Mission modal states mutually exclusive", async () => {
    renderMission();
    await screen.findByRole("button", { name: "Edit categories" });
    fireEvent.click(screen.getByRole("button", { name: "Edit categories" }));
    fireEvent.click(screen.getAllByTitle("Edit milestone description")[0]);

    expect(screen.queryByRole("heading", { name: "Edit Categories" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit milestone description: Milestone 1" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("heading", { name: /Edit milestone description/ })).not.toBeInTheDocument();
  });

  it("suppresses Z during Story Map drag and restores it after cancellation", async () => {
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    const story = mission("MISSION-A").stories[0];

    act(() => missionDragHandlers.start?.({ active: { id: story.key, data: { current: { story } } } } as unknown as DragStartEvent));
    fireEvent.keyDown(window, { key: "z" });
    expect(screen.queryByRole("button", { name: "Exit Focus mode" })).not.toBeInTheDocument();

    act(() => missionDragHandlers.cancel?.());
    fireEvent.keyDown(window, { key: "z" });
    expect(screen.getByRole("button", { name: "Exit Focus mode" })).toBeInTheDocument();
  });

  it("moves focus to normal Mission identity when responsive exit removes the focused command bar", async () => {
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(entry);
    expect(screen.getByRole("heading", { name: /MISSION-A short/ })).toHaveFocus();

    act(() => mediaQuery.setMatches(false));

    expect(screen.getByRole("heading", { name: "MISSION-A full summary" })).toHaveFocus();
  });

  it("preserves focus on a workspace control that survives responsive exit", async () => {
    renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(entry);
    const milestoneRow = screen.getByRole("button", { name: "Milestone 1" });
    milestoneRow.focus();

    act(() => mediaQuery.setMatches(false));

    expect(milestoneRow).toHaveFocus();
  });

  it("suppresses and restores the production application header", async () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/missions/MISSION-A"]}>
          <AppChromeProvider>
            <AppContent />
          </AppChromeProvider>
        </MemoryRouter>
      </StrictMode>,
    );
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    expect(screen.getByRole("banner")).toHaveTextContent("DevMan");

    fireEvent.click(entry);
    await waitFor(() => expect(screen.queryByText("Project tracker — Jira & GitHub")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Exit Focus mode" }));
    expect(await screen.findByText("Project tracker — Jira & GitHub")).toBeInTheDocument();
  });

  it("restores unrelated-route chrome and resets Focus after the Mission page remounts", async () => {
    const router = renderMission();
    const entry = await screen.findByRole("button", { name: "Enter Focus mode" });
    await waitFor(() => expect(entry).toBeEnabled());
    fireEvent.click(entry);

    await act(async () => router.navigate("/support"));
    expect(screen.getByText("DevMan global header")).toBeInTheDocument();
    expect(screen.getByText("Support route")).toBeInTheDocument();

    await act(async () => router.navigate("/missions/MISSION-A"));
    expect(await screen.findByRole("button", { name: "Enter Focus mode" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exit Focus mode" })).not.toBeInTheDocument();
  });
});
