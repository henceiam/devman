import { describe, it, expect } from "vitest";
import { wayfinderTypeMeta } from "./wayfinderBadges";

describe("wayfinderTypeMeta", () => {
  it("returns the correct label for each known type", () => {
    expect(wayfinderTypeMeta("research").label).toBe("Research");
    expect(wayfinderTypeMeta("prototype").label).toBe("Prototype");
    expect(wayfinderTypeMeta("grilling").label).toBe("Grilling");
    expect(wayfinderTypeMeta("task").label).toBe("Task");
  });

  it("falls back to Unknown for a null type", () => {
    expect(wayfinderTypeMeta(null).label).toBe("Unknown");
  });

  it("gives each known type a distinct color class", () => {
    const colors = new Set(
      (["research", "prototype", "grilling", "task"] as const).map((t) => wayfinderTypeMeta(t).color),
    );
    expect(colors.size).toBe(4);
  });
});
