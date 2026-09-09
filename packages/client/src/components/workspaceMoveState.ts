import type { MissionStory } from "../api/client";

export interface WorkspaceMoveState {
  missionKey: string;
  stories: MissionStory[];
  pendingStoryKeys: ReadonlySet<string>;
  queuedStories: MissionStory[] | null;
  error: string | null;
}

export type WorkspaceMoveAction =
  | { type: "sync"; stories: MissionStory[] }
  | { type: "reset"; missionKey: string; stories: MissionStory[] }
  | { type: "start"; storyKey: string; milestone: string | null; category: string | null }
  | { type: "rollback"; story: MissionStory; error: string }
  | { type: "refresh-success"; storyKey: string; stories: MissionStory[] }
  | { type: "refresh-failure"; storyKey: string; error: string }
  | { type: "finish"; storyKey: string };

export function workspaceMoveReducer(state: WorkspaceMoveState, action: WorkspaceMoveAction): WorkspaceMoveState {
  switch (action.type) {
    case "sync":
      return state.pendingStoryKeys.size === 0
        ? { ...state, stories: action.stories, queuedStories: null }
        : { ...state, queuedStories: action.stories };
    case "reset":
      return {
        missionKey: action.missionKey,
        stories: action.stories,
        pendingStoryKeys: new Set(),
        queuedStories: null,
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
      return {
        ...state,
        queuedStories: action.stories,
      };
    }
    case "refresh-failure": {
      const confirmedStory = state.stories.find((story) => story.key === action.storyKey);
      return {
        ...state,
        queuedStories: state.queuedStories && confirmedStory
          ? state.queuedStories.map((story) => story.key === action.storyKey ? confirmedStory : story)
          : state.queuedStories,
        error: action.error,
      };
    }
    case "finish": {
      const pendingStoryKeys = new Set(state.pendingStoryKeys);
      pendingStoryKeys.delete(action.storyKey);
      if (pendingStoryKeys.size === 0 && state.queuedStories) {
        return {
          ...state,
          stories: state.queuedStories,
          pendingStoryKeys,
          queuedStories: null,
        };
      }
      return { ...state, pendingStoryKeys };
    }
  }
}
