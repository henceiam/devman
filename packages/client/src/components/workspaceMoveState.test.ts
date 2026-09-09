import { describe, expect, it } from "vitest";
import { makeStory } from "../test/fixtures";
import { workspaceMoveReducer, type WorkspaceMoveState } from "./workspaceMoveState";

function state(): WorkspaceMoveState {
  return {
    missionKey: "MISSION-A",
    stories: [makeStory({ key: "STORY-1", milestone: "Milestone 1", category: "Feature" })],
    pendingStoryKeys: new Set(),
    queuedStories: null,
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
      storyKey: "STORY-1",
      error: "Refresh failed",
    });
    expect(refreshFailed.stories[0].milestone).toBe("Milestone 2");
    expect(refreshFailed.error).toBe("Refresh failed");

    const serverStories = [makeStory({ key: "STORY-1", milestone: "Milestone 3" })];
    const refreshed = workspaceMoveReducer(moved, {
      type: "refresh-success",
      storyKey: "STORY-1",
      stories: serverStories,
    });
    expect(refreshed.stories[0].milestone).toBe("Milestone 2");
    expect(workspaceMoveReducer(refreshed, { type: "finish", storyKey: "STORY-1" }).stories).toEqual(serverStories);
  });

  it("rebases an older queued snapshot when a later confirmed move cannot refresh", () => {
    const initial = {
      ...state(),
      stories: [
        makeStory({ key: "STORY-A", milestone: "Milestone 1" }),
        makeStory({ key: "STORY-B", milestone: "Milestone 1" }),
      ],
    };
    const movingA = workspaceMoveReducer(initial, {
      type: "start",
      storyKey: "STORY-A",
      milestone: "Milestone 2",
      category: "Feature",
    });
    const movingBoth = workspaceMoveReducer(movingA, {
      type: "start",
      storyKey: "STORY-B",
      milestone: "Milestone 2",
      category: "Feature",
    });
    const canonicalBeforeB = [
      makeStory({ key: "STORY-A", milestone: "Milestone 2", category: "Feature" }),
      makeStory({ key: "STORY-B", milestone: "Milestone 1" }),
    ];
    const refreshedA = workspaceMoveReducer(movingBoth, {
      type: "refresh-success",
      storyKey: "STORY-A",
      stories: canonicalBeforeB,
    });
    const finishedA = workspaceMoveReducer(refreshedA, { type: "finish", storyKey: "STORY-A" });
    const failedBRefresh = workspaceMoveReducer(finishedA, {
      type: "refresh-failure",
      storyKey: "STORY-B",
      error: "Refresh failed",
    });
    const finishedB = workspaceMoveReducer(failedBRefresh, { type: "finish", storyKey: "STORY-B" });

    expect(finishedB.stories.map(({ key, milestone }) => ({ key, milestone }))).toEqual([
      { key: "STORY-A", milestone: "Milestone 2" },
      { key: "STORY-B", milestone: "Milestone 2" },
    ]);
    expect(finishedB.error).toBe("Refresh failed");
    expect(finishedB.queuedStories).toBeNull();
  });

  it("applies the latest queued canonical stories after all concurrent moves finish", () => {
    const initial = {
      ...state(),
      stories: [
        makeStory({ key: "STORY-1", milestone: "Milestone 1" }),
        makeStory({ key: "STORY-2", milestone: "Milestone 1" }),
      ],
    };
    const firstMove = workspaceMoveReducer(initial, {
      type: "start",
      storyKey: "STORY-1",
      milestone: "Milestone 2",
      category: "Feature",
    });
    const secondMove = workspaceMoveReducer(firstMove, {
      type: "start",
      storyKey: "STORY-2",
      milestone: "Milestone 2",
      category: "Feature",
    });
    const olderCanonical = initial.stories.map((story) => ({ ...story, milestone: "Milestone 3" }));
    const newerCanonical = initial.stories.map((story) => ({ ...story, milestone: "Milestone 4" }));
    const firstSync = workspaceMoveReducer(secondMove, { type: "sync", stories: olderCanonical });
    const latestSync = workspaceMoveReducer(firstSync, { type: "sync", stories: newerCanonical });
    const onePending = workspaceMoveReducer(latestSync, { type: "finish", storyKey: "STORY-1" });

    expect(onePending.stories.map((story) => story.milestone)).toEqual(["Milestone 2", "Milestone 2"]);
    expect(onePending.queuedStories).toEqual(newerCanonical);

    const finished = workspaceMoveReducer(onePending, { type: "finish", storyKey: "STORY-2" });
    expect(finished.stories).toEqual(newerCanonical);
    expect(finished.queuedStories).toBeNull();
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
      queuedStories: null,
      error: null,
    });
  });
});
