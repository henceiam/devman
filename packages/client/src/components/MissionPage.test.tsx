import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppContent } from "../App";
import { AppChromeProvider, useAppChromeState } from "../AppChrome";
import { api, type MissionDetail, type MissionSummary } from "../api/client";
import { makeStory } from "../test/fixtures";
import MissionPage from "./MissionPage";

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

    expect(await screen.findByRole("button", { name: "Exit Focus mode" })).toHaveAttribute("aria-keyshortcuts", "Z");
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
