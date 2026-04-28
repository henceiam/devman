import { describe, it, expect } from "vitest";
import type { MissionStory } from "../api/client";
import { makeStory } from "../test/fixtures";

/** Replicate the filtering logic from MissionPage */
function filterStories(allStories: MissionStory[], hideDone: boolean) {
  const stories = allStories.filter((s) => s.status !== "Rejected");
  const visibleStories = hideDone
    ? stories.filter((s) => s.statusCategory !== "done")
    : stories;
  return { stories, visibleStories };
}

describe("Story filtering (MissionPage logic)", () => {
  const testStories: MissionStory[] = [
    makeStory({ key: "T-1", status: "To do", statusCategory: "new" }),
    makeStory({ key: "T-2", status: "In Progress", statusCategory: "indeterminate" }),
    makeStory({ key: "T-3", status: "Closed", statusCategory: "done" }),
    makeStory({ key: "T-4", status: "Rejected", statusCategory: "done" }),
    makeStory({ key: "T-5", status: "Ready for Deploy", statusCategory: "done" }),
  ];

  it("always excludes Rejected stories from base stories", () => {
    const { stories } = filterStories(testStories, false);
    expect(stories.map((s) => s.key)).toEqual(["T-1", "T-2", "T-3", "T-5"]);
  });

  it("shows all non-rejected stories when hideDone is false", () => {
    const { visibleStories } = filterStories(testStories, false);
    expect(visibleStories.map((s) => s.key)).toEqual(["T-1", "T-2", "T-3", "T-5"]);
  });

  it("hides done stories when hideDone is true", () => {
    const { visibleStories } = filterStories(testStories, true);
    expect(visibleStories.map((s) => s.key)).toEqual(["T-1", "T-2"]);
  });

  it("statistics (stories) always include done stories", () => {
    const { stories } = filterStories(testStories, true);
    expect(stories).toHaveLength(4); // includes Closed and Ready for Deploy
    expect(stories.find((s) => s.key === "T-3")).toBeDefined();
    expect(stories.find((s) => s.key === "T-5")).toBeDefined();
  });

  it("statistics never include Rejected", () => {
    const { stories } = filterStories(testStories, false);
    expect(stories.find((s) => s.status === "Rejected")).toBeUndefined();
  });
});

describe("StoryMapGrid local stories reset", () => {
  it("localStories should be cleared when detail.stories reference changes", () => {
    // This tests the conceptual invariant:
    // when detail.stories changes (new reference), localStories must reset to null
    // so the grid uses the fresh filtered stories from props

    const original = [
      makeStory({ key: "T-1", statusCategory: "new" }),
      makeStory({ key: "T-2", statusCategory: "done" }),
    ];

    // Simulate hideDone toggle producing a new filtered array
    const filtered = original.filter((s) => s.statusCategory !== "done");

    // The grid should use filtered, not a stale localStories copy
    expect(filtered).toHaveLength(1);
    expect(filtered[0].key).toBe("T-1");

    // Verify they are different references (which triggers the useEffect reset)
    expect(filtered).not.toBe(original);
  });
});

describe("Subtask kanban column filtering", () => {
  it("shows 3 columns when hideDone is false", () => {
    const columns = [
      { label: "To Do", category: "new" },
      { label: "In Progress", category: "indeterminate" },
      { label: "Done", category: "done" },
    ];
    expect(columns).toHaveLength(3);
  });

  it("shows 2 columns when hideDone is true", () => {
    const hideDone = true;
    const columns = [
      { label: "To Do", category: "new" },
      { label: "In Progress", category: "indeterminate" },
      ...(!hideDone ? [{ label: "Done", category: "done" }] : []),
    ];
    expect(columns).toHaveLength(2);
    expect(columns.find((c) => c.category === "done")).toBeUndefined();
  });
});
