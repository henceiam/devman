import type { WayfinderTicket } from "../api/client";

export type DerivedState = "frontier" | "claimed" | "blocked" | "done";

/**
 * Derives a Wayfinder ticket's state, in precedence order: Done wins over
 * Claimed (an assigned-but-Done ticket is Done, not Claimed), Blocked wins
 * over Frontier. A blocker missing from `all` (e.g. a cross-Story link
 * already dropped upstream) counts as unresolved, same as an open blocker.
 */
export function deriveState(ticket: WayfinderTicket, all: WayfinderTicket[]): DerivedState {
  if (ticket.statusCategory === "done") return "done";
  if (ticket.assignee !== "Unassigned") return "claimed";

  const hasUnresolvedBlocker = ticket.blockedBy.some((key) => {
    const blocker = all.find((t) => t.key === key);
    return !blocker || blocker.statusCategory !== "done";
  });

  return hasUnresolvedBlocker ? "blocked" : "frontier";
}
