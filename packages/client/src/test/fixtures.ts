import type { MissionStory } from "../api/client";

export function makeStory(overrides: Partial<MissionStory> = {}): MissionStory {
  return {
    key: "TEST-1",
    summary: "Test story",
    status: "To do",
    statusCategory: "new",
    assignee: "Test User",
    avatarUrl: null,
    size: "M",
    milestone: "Milestone 1",
    category: "Feature",
    copyStatus: null,
    type: "Story",
    subtaskProgress: null,
    prState: null,
    ...overrides,
  };
}
