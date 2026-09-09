import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { api, type MissionDetail } from "../api/client";
import MilestoneGroup from "./MilestoneGroup";
import { projectMilestones, type MilestoneRow } from "./milestoneProjection";
import StoryMapGrid from "./StoryMapGrid";
import { workspaceMoveReducer } from "./workspaceMoveState";

interface MilestoneWorkspaceProps {
  detail: MissionDetail;
  viewMode: "list" | "map";
  hideDone: boolean;
  focusMode: boolean;
  descriptions: Record<string, string>;
  onStoryUpdated: () => Promise<StoryRefreshResult>;
  onStorySelect?: (key: string) => void;
  onEditDescription?: (milestoneName: string) => void;
  onDragActiveChange?: (active: boolean) => void;
}

export type StoryRefreshResult =
  | { status: "refreshed"; detail: MissionDetail }
  | { status: "superseded" };

export function rowsForWorkspace(rows: MilestoneRow[], focusMode: boolean): MilestoneRow[] {
  return focusMode ? rows.filter((row) => row.visibleStories.length > 0) : rows;
}

export default function MilestoneWorkspace({ detail, viewMode, hideDone, focusMode, descriptions, onStoryUpdated, onStorySelect, onEditDescription, onDragActiveChange }: MilestoneWorkspaceProps) {
  const [moveState, dispatchMove] = useReducer(workspaceMoveReducer, {
    missionKey: detail.epic.key,
    stories: detail.stories,
    pendingStoryKeys: new Set<string>(),
    queuedStories: null,
    error: null,
  });
  const [listExpanded, setListExpanded] = useState<Set<string>>(new Set());
  const [mapCollapsed, setMapCollapsed] = useState<Set<string>>(new Set(["Out of scope"]));
  const pendingStoryKeysRef = useRef(new Set<string>());
  const missionGenerationRef = useRef({ key: detail.epic.key, generation: 0 });
  const storiesRef = useRef(detail.stories);
  if (missionGenerationRef.current.key !== detail.epic.key) {
    missionGenerationRef.current = {
      key: detail.epic.key,
      generation: missionGenerationRef.current.generation + 1,
    };
  }
  storiesRef.current = moveState.missionKey === detail.epic.key ? moveState.stories : detail.stories;

  useEffect(() => {
    dispatchMove({ type: "sync", stories: detail.stories });
  }, [detail.stories]);

  useEffect(() => {
    pendingStoryKeysRef.current.clear();
    dispatchMove({ type: "reset", missionKey: detail.epic.key, stories: detail.stories });
    setListExpanded(new Set());
    setMapCollapsed(new Set(["Out of scope"]));
  }, [detail.epic.key]);

  useEffect(() => () => {
    missionGenerationRef.current.generation += 1;
  }, []);

  const stories = moveState.missionKey === detail.epic.key ? moveState.stories : detail.stories;

  const projectedRows = useMemo(
    () => projectMilestones({ stories, hideDone, descriptions }),
    [stories, hideDone, descriptions],
  );
  const rows = useMemo(
    () => rowsForWorkspace(projectedRows, focusMode),
    [projectedRows, focusMode],
  );

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moveStory = async (storyKey: string, milestone: string | null, category: string | null) => {
    const generation = missionGenerationRef.current.generation;
    const isCurrentGeneration = () => missionGenerationRef.current.generation === generation;
    const previousStory = storiesRef.current.find((story) => story.key === storyKey);
    if (!previousStory || pendingStoryKeysRef.current.has(storyKey)) return;
    pendingStoryKeysRef.current.add(storyKey);
    dispatchMove({ type: "start", storyKey, milestone, category });
    try {
      await api.missions.updateStory(storyKey, { milestone, category });
      if (!isCurrentGeneration()) return;
      try {
        const refreshResult = await onStoryUpdated();
        if (isCurrentGeneration() && refreshResult.status === "refreshed") {
          dispatchMove({ type: "refresh-success", storyKey, stories: refreshResult.detail.stories });
        }
      } catch {
        if (isCurrentGeneration()) {
          dispatchMove({
            type: "refresh-failure",
            storyKey,
            error: "Story moved, but Mission data could not be refreshed.",
          });
        }
      }
    } catch (error) {
      if (isCurrentGeneration()) {
        dispatchMove({
          type: "rollback",
          story: previousStory,
          error: error instanceof Error ? error.message : "Failed to move story.",
        });
      }
    } finally {
      if (isCurrentGeneration()) {
        pendingStoryKeysRef.current.delete(storyKey);
        dispatchMove({ type: "finish", storyKey });
      }
    }
  };

  if (viewMode === "list") {
    return <div className="space-y-3">
      {moveState.error && <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{moveState.error}</div>}
      {rows.map((row) => <MilestoneGroup
        key={row.id}
        row={row}
        open={listExpanded.has(row.id)}
        onToggle={() => toggle(setListExpanded, row.id)}
        onStorySelect={onStorySelect}
        onEditDescription={onEditDescription ? () => onEditDescription(row.displayName) : undefined}
      />)}
    </div>;
  }

  return <div className="space-y-3">
    {moveState.error && <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{moveState.error}</div>}
    <StoryMapGrid
      epic={detail.epic}
      rows={rows}
      collapsedRows={mapCollapsed}
      onToggleRow={(id) => toggle(setMapCollapsed, id)}
      onMoveStory={moveStory}
      pendingStoryKeys={moveState.pendingStoryKeys}
      onStorySelect={onStorySelect}
      onEditDescription={onEditDescription}
      onDragActiveChange={onDragActiveChange}
    />
  </div>;
}
