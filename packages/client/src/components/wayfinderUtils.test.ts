import { describe, it, expect } from "vitest";
import { deriveState } from "./wayfinderUtils";
import type { WayfinderTicket } from "../api/client";

function ticket(overrides: Partial<WayfinderTicket>): WayfinderTicket {
  return {
    key: "WF-1",
    summary: "Ticket",
    status: "To do",
    statusCategory: "new",
    assignee: "Unassigned",
    avatarUrl: null,
    type: "task",
    blockedBy: [],
    blocks: [],
    ...overrides,
  };
}

describe("deriveState", () => {
  it("returns frontier for an unassigned, open ticket with no blockers", () => {
    const t = ticket({ key: "WF-1", blockedBy: [] });
    expect(deriveState(t, [t])).toBe("frontier");
  });

  it("returns frontier when every blocker is done", () => {
    const blocker = ticket({ key: "WF-1", statusCategory: "done" });
    const t = ticket({ key: "WF-2", blockedBy: ["WF-1"] });
    expect(deriveState(t, [blocker, t])).toBe("frontier");
  });

  it("returns done for a done ticket, even if it has an assignee (done wins over claimed)", () => {
    const t = ticket({ key: "WF-1", statusCategory: "done", assignee: "Henric Johansson" });
    expect(deriveState(t, [t])).toBe("done");
  });

  it("returns claimed for an assigned, not-done ticket with no unresolved blockers", () => {
    const t = ticket({ key: "WF-1", assignee: "Henric Johansson", statusCategory: "indeterminate" });
    expect(deriveState(t, [t])).toBe("claimed");
  });

  it("returns blocked when a blocker exists in the set and is not done", () => {
    const blocker = ticket({ key: "WF-1", statusCategory: "indeterminate" });
    const t = ticket({ key: "WF-2", blockedBy: ["WF-1"] });
    expect(deriveState(t, [blocker, t])).toBe("blocked");
  });

  it("returns blocked when a blocker key is missing from the same-Story ticket set", () => {
    const t = ticket({ key: "WF-2", blockedBy: ["WF-OUTSIDE-STORY"] });
    expect(deriveState(t, [t])).toBe("blocked");
  });

  it("returns claimed (not blocked) for an assigned ticket even with an unresolved blocker — claimed outranks blocked", () => {
    const blocker = ticket({ key: "WF-1", statusCategory: "new" });
    const t = ticket({ key: "WF-2", assignee: "Henric Johansson", blockedBy: ["WF-1"] });
    expect(deriveState(t, [blocker, t])).toBe("claimed");
  });

  it("returns frontier only when ALL blockers are done, not just some", () => {
    const doneBlocker = ticket({ key: "WF-1", statusCategory: "done" });
    const openBlocker = ticket({ key: "WF-2", statusCategory: "new" });
    const t = ticket({ key: "WF-3", blockedBy: ["WF-1", "WF-2"] });
    expect(deriveState(t, [doneBlocker, openBlocker, t])).toBe("blocked");
  });
});
