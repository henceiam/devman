import { describe, expect, it } from "vitest";
import { makeStory } from "../test/fixtures";
import { projectMilestones } from "./milestoneProjection";

describe("projectMilestones", () => {
  it("projects exact Jira milestones in planning order with complete row metadata", () => {
    const rows = projectMilestones({
      stories: [
        makeStory({ key: "UNASSIGNED", milestone: null }),
        makeStory({ key: "NUMBERED", milestone: "Milestone 2", statusCategory: "done" }),
        makeStory({ key: "UNKNOWN-B", milestone: "milestone 3" }),
        makeStory({ key: "UNKNOWN-A", milestone: "Milestone 03" }),
        makeStory({ key: "OUT", milestone: "Out of scope" }),
      ],
      hideDone: false,
      descriptions: { "Milestone 2": "Release candidate" },
    });

    expect(rows.map((row) => row.displayName)).toEqual([
      "No milestone",
      "Milestone 2",
      "Milestone 3",
      "Milestone 4",
      "Milestone 03",
      "milestone 3",
      "Out of scope",
    ]);
    expect(rows.map((row) => row.kind)).toEqual([
      "unassigned",
      "numbered",
      "numbered",
      "numbered",
      "unknown",
      "unknown",
      "out-of-scope",
    ]);
    expect(rows[1]).toMatchObject({
      id: "Milestone 2",
      milestoneValue: "Milestone 2",
      milestoneNumber: 2,
      description: "Release candidate",
      statusCounts: { total: 1, done: 1, inProgress: 0, toDo: 0 },
      synthesized: false,
      descriptionEditable: true,
      dropEligible: true,
    });
    expect(rows[0]).toMatchObject({
      id: "__unassigned__",
      milestoneValue: null,
      descriptionEditable: false,
      dropEligible: true,
    });
    expect(rows[4].dropEligible).toBe(false);
  });

  it("merges Jira None and null into the canonical unassigned row", () => {
    const nullStory = makeStory({ key: "NULL", milestone: null });
    const noneStory = makeStory({ key: "NONE", milestone: "None" });
    const rows = projectMilestones({
      stories: [nullStory, noneStory],
      hideDone: false,
      descriptions: {},
    });

    expect(rows.filter((row) => row.kind === "unassigned")).toEqual([
      expect.objectContaining({
        id: "__unassigned__",
        milestoneValue: null,
        displayName: "No milestone",
        allStories: [nullStory, noneStory],
        visibleStories: [nullStory, noneStory],
        dropEligible: true,
      }),
    ]);
    expect(rows.some((row) => row.kind === "unknown" && row.displayName === "None")).toBe(false);
  });

  it("excludes rejected stories before projection and hides Done cards without changing truth", () => {
    const done = makeStory({ key: "DONE", milestone: "Milestone 7", statusCategory: "done" });
    const rows = projectMilestones({
      stories: [done, makeStory({ key: "REJECTED", milestone: "Out of scope", status: "Rejected" })],
      hideDone: true,
      descriptions: {},
    });

    expect(rows.map((row) => row.displayName)).toEqual(["Milestone 7", "Milestone 8", "Milestone 9"]);
    expect(rows[0].allStories).toEqual([done]);
    expect(rows[0].visibleStories).toEqual([]);
    expect(rows[0].statusCounts).toEqual({ total: 1, done: 1, inProgress: 0, toDo: 0 });
  });

  it("synthesizes only the next two used milestones and includes described empty milestones", () => {
    const rows = projectMilestones({
      stories: [makeStory({ milestone: "Milestone 8" })],
      hideDone: false,
      descriptions: {
        "Milestone 1": "Earlier plan",
        "Milestone 6": "   ",
        "Milestone 11": "Invalid",
      },
    });

    expect(rows.map((row) => row.displayName)).toEqual([
      "Milestone 1",
      "Milestone 8",
      "Milestone 9",
      "Milestone 10",
    ]);
    expect(rows.find((row) => row.displayName === "Milestone 1")).toMatchObject({
      description: "Earlier plan",
      synthesized: false,
      allStories: [],
    });
    expect(rows.find((row) => row.displayName === "Milestone 9")?.synthesized).toBe(true);
  });

  it("starts planning with Milestones 1 and 2 when no numbered milestone is used", () => {
    expect(projectMilestones({ stories: [], hideDone: false, descriptions: {} }).map((row) => row.displayName))
      .toEqual(["Milestone 1", "Milestone 2"]);
  });

  it("treats only exact Milestone 1 through Milestone 10 values as numbered", () => {
    const malformedValues = [
      "Milestone 0",
      "Milestone 01",
      "Milestone 11",
      "milestone 1",
      "Milestone 1 ",
    ];
    const rows = projectMilestones({
      stories: [
        makeStory({ key: "FIRST", milestone: "Milestone 1" }),
        makeStory({ key: "LAST", milestone: "Milestone 10" }),
        ...malformedValues.map((milestone, index) => makeStory({ key: `UNKNOWN-${index}`, milestone })),
      ],
      hideDone: false,
      descriptions: {},
    });

    expect(rows.filter((row) => row.kind === "numbered").map((row) => row.displayName))
      .toEqual(["Milestone 1", "Milestone 10"]);
    expect(rows.filter((row) => row.kind === "unknown").map((row) => row.displayName))
      .toEqual(["Milestone 0", "Milestone 01", "Milestone 1 ", "Milestone 11", "milestone 1"]);
  });

  it("caps future milestones at 10 without filling gaps", () => {
    const rows = projectMilestones({
      stories: [
        makeStory({ key: "EARLY", milestone: "Milestone 2" }),
        makeStory({ key: "LATE", milestone: "Milestone 9" }),
      ],
      hideDone: false,
      descriptions: {},
    });

    expect(rows.map((row) => row.displayName)).toEqual(["Milestone 2", "Milestone 9", "Milestone 10"]);
  });

  it("includes described numbered milestones without advancing future synthesis", () => {
    const rows = projectMilestones({
      stories: [],
      hideDone: false,
      descriptions: { "Milestone 8": "Later planning" },
    });

    expect(rows.map((row) => row.displayName)).toEqual(["Milestone 1", "Milestone 2", "Milestone 8"]);
    expect(rows.map((row) => row.synthesized)).toEqual([true, true, false]);
  });

  it("ignores descriptions stored under malformed, special, and unknown values", () => {
    const rows = projectMilestones({
      stories: [
        makeStory({ key: "NONE", milestone: null }),
        makeStory({ key: "MALFORMED", milestone: "Milestone 01" }),
        makeStory({ key: "UNKNOWN", milestone: "Later" }),
        makeStory({ key: "OUT", milestone: "Out of scope" }),
      ],
      hideDone: false,
      descriptions: {
        "No milestone": "Invalid special description",
        "Milestone 01": "Invalid malformed description",
        Later: "Invalid unknown description",
        "Out of scope": "Invalid special description",
      },
    });

    expect(rows.filter((row) => row.kind !== "numbered").map((row) => ({
      name: row.displayName,
      description: row.description,
      editable: row.descriptionEditable,
      dropEligible: row.dropEligible,
    }))).toEqual([
      { name: "No milestone", description: "", editable: false, dropEligible: true },
      { name: "Later", description: "", editable: false, dropEligible: false },
      { name: "Milestone 01", description: "", editable: false, dropEligible: false },
      { name: "Out of scope", description: "", editable: false, dropEligible: true },
    ]);
  });

  it("never creates special or unknown rows from rejected stories", () => {
    const rows = projectMilestones({
      stories: [
        makeStory({ key: "NONE", milestone: null, status: "Rejected" }),
        makeStory({ key: "UNKNOWN", milestone: "Later", status: "Rejected" }),
        makeStory({ key: "OUT", milestone: "Out of scope", status: "Rejected" }),
      ],
      hideDone: false,
      descriptions: {},
    });

    expect(rows.map((row) => row.displayName)).toEqual(["Milestone 1", "Milestone 2"]);
  });
});
