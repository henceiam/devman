import { describe, expect, it } from "vitest";
import { makeStory } from "../test/fixtures";
import { workspaceMoveReducer, type WorkspaceMoveState } from "./workspaceMoveState";

function state(): WorkspaceMoveState {
  return {
    missionKey: "MISSION-A",
    stories: [makeStory({ key: "STORY-1", milestone: "Milestone 1", category: "Feature" })],
    pendingStoryKeys: new Set(),
    error: null,
  };
}

describe("workspaceMoveReducer", () => {
  it("applies a move immediately and locks the pending story", () => {
    const moved = workspaceMoveReducer(state(), {
      type: "start",
      storyKey: "STORY-1",
      milestone: "Milestone 2",
      category: null,
    });

    expect(moved.stories[0]).toMatchObject({ milestone: "Milestone 2", category: null });
    expect(moved.pendingStoryKeys.has("STORY-1")).toBe(true);
    expect(workspaceMoveReducer(moved, {
      type: "start",
      storyKey: "STORY-1",
      milestone: "Milestone 3",
      category: "Feature",
    })).toBe(moved);
  });

  it("rolls back persistence failures and clears the lock when finished", () => {
    const initial = state();
    const moved = workspaceMoveReducer(initial, {
      type: "start",
      storyKey: "STORY-1",
      milestone: "Milestone 2",
      category: null,
    });
    const rolledBack = workspaceMoveReducer(moved, {
      type: "rollback",
      story: initial.stories[0],
      error: "Jira rejected the move",
    });
    const finished = workspaceMoveReducer(rolledBack, { type: "finish", storyKey: "STORY-1" });

    expect(finished.stories).toEqual(initial.stories);
    expect(finished.error).toBe("Jira rejected the move");
    expect(finished.pendingStoryKeys.size).toBe(0);
  });

  it("replaces optimistic data after refresh but retains it when refresh fails", () => {
    const moved = workspaceMoveReducer(state(), {
      type: "start",
      storyKey: "STORY-1",
      milestone: "Milestone 2",
      category: null,
    });
    const refreshFailed = workspaceMoveReducer(moved, {
      type: "refresh-failure",
      error: "Refresh failed",
    });
    expect(refreshFailed.stories[0].milestone).toBe("Milestone 2");
    expect(refreshFailed.error).toBe("Refresh failed");

    const serverStories = [makeStory({ key: "STORY-1", milestone: "Milestone 3" })];
    expect(workspaceMoveReducer(moved, {
      type: "refresh-success",
      storyKey: "STORY-1",
      stories: serverStories,
    }).stories).toEqual(serverStories);
  });

  it("resets optimistic, pending, and error state on Mission change", () => {
    const moved = workspaceMoveReducer(state(), {
      type: "start",
      storyKey: "STORY-1",
      milestone: "Milestone 2",
      category: null,
    });
    const nextStories = [makeStory({ key: "OTHER-1", milestone: "Milestone 4" })];
    const reset = workspaceMoveReducer(
      { ...moved, error: "Old error" },
      { type: "reset", missionKey: "MISSION-B", stories: nextStories },
    );

    expect(reset).toEqual({
      missionKey: "MISSION-B",
      stories: nextStories,
      pendingStoryKeys: new Set(),
      error: null,
    });
  });
});
