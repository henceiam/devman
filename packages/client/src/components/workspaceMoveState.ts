import type { MissionStory } from "../api/client";

export interface WorkspaceMoveState {
  missionKey: string;
  stories: MissionStory[];
  pendingStoryKeys: ReadonlySet<string>;
  error: string | null;
}

export type WorkspaceMoveAction =
  | { type: "sync"; stories: MissionStory[] }
  | { type: "reset"; missionKey: string; stories: MissionStory[] }
  | { type: "start"; storyKey: string; milestone: string | null; category: string | null }
  | { type: "rollback"; story: MissionStory; error: string }
  | { type: "refresh-success"; storyKey: string; stories: MissionStory[] }
  | { type: "refresh-failure"; error: string }
  | { type: "finish"; storyKey: string };

export function workspaceMoveReducer(state: WorkspaceMoveState, action: WorkspaceMoveAction): WorkspaceMoveState {
  switch (action.type) {
    case "sync":
      return state.pendingStoryKeys.size === 0 ? { ...state, stories: action.stories } : state;
    case "reset":
      return {
        missionKey: action.missionKey,
        stories: action.stories,
        pendingStoryKeys: new Set(),
        error: null,
      };
    case "start": {
      if (state.pendingStoryKeys.has(action.storyKey)) return state;
      return {
        ...state,
        stories: state.stories.map((story) => story.key === action.storyKey
          ? { ...story, milestone: action.milestone, category: action.category }
          : story),
        pendingStoryKeys: new Set(state.pendingStoryKeys).add(action.storyKey),
        error: null,
      };
    }
    case "rollback":
      return {
        ...state,
        stories: state.stories.map((story) => story.key === action.story.key ? action.story : story),
        error: action.error,
      };
    case "refresh-success": {
      const optimisticStories = new Map(
        state.stories
          .filter((story) => story.key !== action.storyKey && state.pendingStoryKeys.has(story.key))
          .map((story) => [story.key, story]),
      );
      return {
        ...state,
        stories: action.stories.map((story) => optimisticStories.get(story.key) ?? story),
      };
    }
    case "refresh-failure":
      return { ...state, error: action.error };
    case "finish": {
      const pendingStoryKeys = new Set(state.pendingStoryKeys);
      pendingStoryKeys.delete(action.storyKey);
      return { ...state, pendingStoryKeys };
    }
  }
}
