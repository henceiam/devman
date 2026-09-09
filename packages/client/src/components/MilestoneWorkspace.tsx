import { useEffect, useMemo, useState } from "react";
import { api, type MissionDetail, type MissionStory } from "../api/client";
import MilestoneGroup from "./MilestoneGroup";
import { projectMilestones, type MilestoneRow } from "./milestoneProjection";
import StoryMapGrid from "./StoryMapGrid";

interface MilestoneWorkspaceProps {
  detail: MissionDetail;
  viewMode: "list" | "map";
  hideDone: boolean;
  focusMode: boolean;
  descriptions: Record<string, string>;
  onStoryUpdated: () => Promise<MissionDetail>;
  onStorySelect?: (key: string) => void;
  onEditDescription?: (milestoneName: string) => void;
  onDragActiveChange?: (active: boolean) => void;
}

export function rowsForWorkspace(rows: MilestoneRow[], focusMode: boolean): MilestoneRow[] {
  return focusMode ? rows.filter((row) => row.visibleStories.length > 0) : rows;
}

export default function MilestoneWorkspace({ detail, viewMode, hideDone, focusMode, descriptions, onStoryUpdated, onStorySelect, onEditDescription, onDragActiveChange }: MilestoneWorkspaceProps) {
  const [stories, setStories] = useState(detail.stories);
  const [listExpanded, setListExpanded] = useState<Set<string>>(new Set());
  const [mapCollapsed, setMapCollapsed] = useState<Set<string>>(new Set(["Out of scope"]));
  const [pendingStoryKeys, setPendingStoryKeys] = useState<Set<string>>(new Set());
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    setStories(detail.stories);
  }, [detail.stories]);

  useEffect(() => {
    setStories(detail.stories);
    setListExpanded(new Set());
    setMapCollapsed(new Set(["Out of scope"]));
    setPendingStoryKeys(new Set());
    setMoveError(null);
  }, [detail.epic.key]);

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
    const previousStory = stories.find((story) => story.key === storyKey);
    if (!previousStory || pendingStoryKeys.has(storyKey)) return;
    setMoveError(null);
    setPendingStoryKeys((current) => new Set(current).add(storyKey));
    setStories((current) => current.map((story) => story.key === storyKey ? { ...story, milestone, category } : story));
    try {
      await api.missions.updateStory(storyKey, { milestone, category });
      try {
        const refreshedDetail = await onStoryUpdated();
        setStories(refreshedDetail.stories);
      } catch {
        setMoveError("Story moved, but Mission data could not be refreshed.");
      }
    } catch (error) {
      setStories((current) => current.map((story) => story.key === storyKey ? previousStory : story));
      setMoveError(error instanceof Error ? error.message : "Failed to move story.");
    } finally {
      setPendingStoryKeys((current) => {
        const next = new Set(current);
        next.delete(storyKey);
        return next;
      });
    }
  };

  if (viewMode === "list") {
    return <div className="space-y-3">
      {moveError && <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{moveError}</div>}
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
    {moveError && <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{moveError}</div>}
    <StoryMapGrid
      epic={detail.epic}
      rows={rows}
      collapsedRows={mapCollapsed}
      onToggleRow={(id) => toggle(setMapCollapsed, id)}
      onMoveStory={moveStory}
      pendingStoryKeys={pendingStoryKeys}
      onStorySelect={onStorySelect}
      onEditDescription={onEditDescription}
      onDragActiveChange={onDragActiveChange}
    />
  </div>;
}
