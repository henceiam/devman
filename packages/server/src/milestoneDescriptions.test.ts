import { describe, expect, it } from "vitest";
import { isMilestoneDescriptionKey } from "./milestoneDescriptions.js";

describe("isMilestoneDescriptionKey", () => {
  it("accepts every exact numbered milestone description key", () => {
    for (let number = 1; number <= 10; number++) {
      expect(isMilestoneDescriptionKey(`Milestone ${number}`)).toBe(true);
    }
  });

  it.each([
    "",
    "Milestone 0",
    "Milestone 01",
    "Milestone 11",
    "milestone 1",
    "MILESTONE 1",
    " Milestone 1",
    "Milestone 1 ",
    "No milestone",
    "Out of scope",
    "Later",
  ])("rejects unsupported description key %j", (value) => {
    expect(isMilestoneDescriptionKey(value)).toBe(false);
  });
});
