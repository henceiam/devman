import type { MissionStory } from "../api/client";

export type MilestoneKind = "unassigned" | "numbered" | "unknown" | "out-of-scope";

export interface MilestoneStatusCounts {
  total: number;
  done: number;
  inProgress: number;
  toDo: number;
}

export interface MilestoneRow {
  id: string;
  kind: MilestoneKind;
  milestoneValue: string | null;
  displayName: string;
  milestoneNumber?: number;
  description: string;
  allStories: MissionStory[];
  visibleStories: MissionStory[];
  statusCounts: MilestoneStatusCounts;
  synthesized: boolean;
  descriptionEditable: boolean;
  dropEligible: boolean;
}

interface ProjectMilestonesInput {
  stories: MissionStory[];
  hideDone: boolean;
  descriptions: Record<string, string>;
}

const NUMBERED_MILESTONE = /^Milestone ([1-9]|10)$/;
const OUT_OF_SCOPE = "Out of scope";

function milestoneNumber(value: string): number | undefined {
  const match = NUMBERED_MILESTONE.exec(value);
  return match ? Number(match[1]) : undefined;
}

function statusCounts(stories: MissionStory[]): MilestoneStatusCounts {
  const counts = { total: stories.length, done: 0, inProgress: 0, toDo: 0 };
  for (const story of stories) {
    if (story.statusCategory === "done") counts.done++;
    else if (story.statusCategory === "indeterminate") counts.inProgress++;
    else counts.toDo++;
  }
  return counts;
}

export function projectMilestones({ stories, hideDone, descriptions }: ProjectMilestonesInput): MilestoneRow[] {
  const nonRejectedStories = stories.filter((story) => story.status !== "Rejected");
  const groups = new Map<string | null, MissionStory[]>();

  for (const story of nonRejectedStories) {
    const group = groups.get(story.milestone);
    if (group) group.push(story);
    else groups.set(story.milestone, [story]);
  }

  const usedNumbers = Array.from(groups.keys())
    .flatMap((value) => value === null ? [] : milestoneNumber(value) ?? []);
  const numberedValues = new Set(usedNumbers.map((number) => `Milestone ${number}`));
  const highestUsed = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0;
  const futureStart = highestUsed > 0 ? highestUsed + 1 : 1;
  for (let number = futureStart; number <= Math.min(futureStart + 1, 10); number++) {
    numberedValues.add(`Milestone ${number}`);
  }
  for (const [value, description] of Object.entries(descriptions)) {
    if (description.trim() && milestoneNumber(value) !== undefined) numberedValues.add(value);
  }

  const rows: MilestoneRow[] = [];
  const addRow = (value: string | null, kind: MilestoneKind, synthesized = false) => {
    const allStories = groups.get(value) ?? [];
    const number = value === null ? undefined : milestoneNumber(value);
    rows.push({
      id: value ?? "__unassigned__",
      kind,
      milestoneValue: value,
      displayName: value ?? "No milestone",
      ...(number === undefined ? {} : { milestoneNumber: number }),
      description: value === null ? "" : descriptions[value] ?? "",
      allStories,
      visibleStories: hideDone ? allStories.filter((story) => story.statusCategory !== "done") : allStories,
      statusCounts: statusCounts(allStories),
      synthesized,
      descriptionEditable: kind === "numbered",
      dropEligible: kind !== "unknown",
    });
  };

  if (groups.has(null)) addRow(null, "unassigned");

  for (const value of Array.from(numberedValues).sort((a, b) => milestoneNumber(a)! - milestoneNumber(b)!)) {
    addRow(value, "numbered", !groups.has(value) && !(descriptions[value]?.trim()));
  }

  const unknownValues = Array.from(groups.keys())
    .filter((value): value is string => value !== null && value !== OUT_OF_SCOPE && milestoneNumber(value) === undefined)
    .sort((a, b) => a.localeCompare(b));
  for (const value of unknownValues) addRow(value, "unknown");

  if (groups.has(OUT_OF_SCOPE)) addRow(OUT_OF_SCOPE, "out-of-scope");
  return rows;
}
