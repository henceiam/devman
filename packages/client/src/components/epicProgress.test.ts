import { describe, it, expect } from "vitest";

// Replicates the epic progress accumulation logic from launchpad.ts
interface ChildIssue {
  key: string;
  ownerKey: string; // resolved parent epic key
  statusName: string;
  statusCategory: string;
}

function accumulateEpicProgress(
  children: ChildIssue[],
  epicKeys: Set<string>,
): Map<string, { done: number; inProgress: number; total: number }> {
  const map = new Map<string, { done: number; inProgress: number; total: number }>();
  const seen = new Set<string>();

  for (const child of children) {
    if (seen.has(child.key)) continue; // deduplicate
    seen.add(child.key);
    if (!epicKeys.has(child.ownerKey)) continue;
    if (child.statusName === "Rejected") continue; // excluded
    const cat = child.statusCategory;
    const prev = map.get(child.ownerKey) ?? { done: 0, inProgress: 0, total: 0 };
    map.set(child.ownerKey, {
      done: prev.done + (cat === "done" ? 1 : 0),
      inProgress: prev.inProgress + (cat === "indeterminate" ? 1 : 0),
      total: prev.total + 1,
    });
  }
  return map;
}

const EPIC_A = "EBBACKLOG-100";
const EPIC_B = "EBBACKLOG-200";

describe("epicProgress accumulation", () => {
  it("counts done and in-progress children correctly", () => {
    const children: ChildIssue[] = [
      { key: "S-1", ownerKey: EPIC_A, statusName: "Closed", statusCategory: "done" },
      { key: "S-2", ownerKey: EPIC_A, statusName: "In Progress", statusCategory: "indeterminate" },
      { key: "S-3", ownerKey: EPIC_A, statusName: "To do", statusCategory: "new" },
    ];
    const result = accumulateEpicProgress(children, new Set([EPIC_A]));
    expect(result.get(EPIC_A)).toEqual({ done: 1, inProgress: 1, total: 3 });
  });

  it("excludes Rejected from total", () => {
    const children: ChildIssue[] = [
      { key: "S-1", ownerKey: EPIC_A, statusName: "Closed", statusCategory: "done" },
      { key: "S-2", ownerKey: EPIC_A, statusName: "Rejected", statusCategory: "done" },
      { key: "S-3", ownerKey: EPIC_A, statusName: "Closed", statusCategory: "done" },
      { key: "S-4", ownerKey: EPIC_A, statusName: "To do", statusCategory: "new" },
    ];
    const result = accumulateEpicProgress(children, new Set([EPIC_A]));
    // S-2 excluded: 3 remaining, 2 done
    expect(result.get(EPIC_A)).toEqual({ done: 2, inProgress: 0, total: 3 });
  });

  it("deduplicates children appearing in both parent and Epic Link results", () => {
    const children: ChildIssue[] = [
      { key: "S-1", ownerKey: EPIC_A, statusName: "Closed", statusCategory: "done" },
      { key: "S-1", ownerKey: EPIC_A, statusName: "Closed", statusCategory: "done" }, // duplicate
      { key: "S-2", ownerKey: EPIC_A, statusName: "To do", statusCategory: "new" },
    ];
    const result = accumulateEpicProgress(children, new Set([EPIC_A]));
    expect(result.get(EPIC_A)).toEqual({ done: 1, inProgress: 0, total: 2 });
  });

  it("skips children whose epic is not in the epicKeys set", () => {
    const children: ChildIssue[] = [
      { key: "S-1", ownerKey: "EBBACKLOG-999", statusName: "Closed", statusCategory: "done" },
    ];
    const result = accumulateEpicProgress(children, new Set([EPIC_A]));
    expect(result.get(EPIC_A)).toBeUndefined();
    expect(result.get("EBBACKLOG-999")).toBeUndefined();
  });

  it("tracks progress per epic independently", () => {
    const children: ChildIssue[] = [
      { key: "S-1", ownerKey: EPIC_A, statusName: "Closed", statusCategory: "done" },
      { key: "S-2", ownerKey: EPIC_A, statusName: "To do", statusCategory: "new" },
      { key: "S-3", ownerKey: EPIC_B, statusName: "In Progress", statusCategory: "indeterminate" },
      { key: "S-4", ownerKey: EPIC_B, statusName: "Closed", statusCategory: "done" },
      { key: "S-5", ownerKey: EPIC_B, statusName: "Rejected", statusCategory: "done" },
    ];
    const result = accumulateEpicProgress(children, new Set([EPIC_A, EPIC_B]));
    expect(result.get(EPIC_A)).toEqual({ done: 1, inProgress: 0, total: 2 });
    expect(result.get(EPIC_B)).toEqual({ done: 1, inProgress: 1, total: 2 }); // S-5 excluded
  });

  it("returns empty map when all children are Rejected", () => {
    const children: ChildIssue[] = [
      { key: "S-1", ownerKey: EPIC_A, statusName: "Rejected", statusCategory: "done" },
      { key: "S-2", ownerKey: EPIC_A, statusName: "Rejected", statusCategory: "done" },
    ];
    const result = accumulateEpicProgress(children, new Set([EPIC_A]));
    expect(result.get(EPIC_A)).toBeUndefined();
  });
});
