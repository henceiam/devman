# 08: Wayfinder tab — data plumbing + list view

**What to build:** The full path from Jira to screen for the Wayfinder tab's MVP: a Story labeled `wayfinder:map` shows a Wayfinder tab; opening it loads that Story's Subtasks as Wayfinder tickets and renders them as a four-section grouped list (Frontier / Claimed / Blocked / Done). This is independently demoable against the real fixture Story before any graph view exists.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The Story detail fetch also requests the Story's own `labels` (today only Subtasks carry labels in this response); the response gains a `labels: string[]` field.
- [ ] A new lazy-loaded endpoint returns, for a given Story, each Subtask as a Wayfinder ticket: key, summary, status, status category, assignee (existing "Unassigned" sentinel convention), avatar URL, a `type` derived from whichever `wayfinder:<research|prototype|grilling|task>` label is present (`null` if none), and two key lists — `blockedBy` and `blocks` — built from the Subtask's `Blocks`/`is blocked by` issue links, filtered to keep only links to other Subtasks of the same Story (an edge to any issue outside that set is dropped entirely, not surfaced). No derived state is computed by this endpoint — raw ticket + link data only.
- [ ] This endpoint's data is fetched only when the Wayfinder tab is first opened (same on-click-then-cache behavior and loading/error state shape as the existing GitHub tab in this modal), not as part of the always-loaded Story detail fetch.
- [ ] A new small pure-function module implements frontier/claimed/blocked/done derivation, given one ticket and the full ticket list, in this precedence: Done (own status category is Done) → Claimed (not Done, has an assignee) → Blocked (not Done, not Claimed, at least one `blockedBy` ticket is not Done or is missing from the set) → Frontier (none of the above). This module also implements the `wayfinder:<type>` label parser.
- [ ] Both functions in that module have unit tests (same runner and "pure functions, test file beside it" pattern already used elsewhere in this codebase for Jira-status-adjacent derivation logic), covering at minimum: no blockers, an assigned-but-Done ticket (must resolve to Done, not Claimed), and a blocker missing from the same-Story ticket set (must resolve to Blocked, not Frontier).
- [ ] The Wayfinder tab button is rendered only when the open Story's `labels` includes `wayfinder:map` (same conditional-tab pattern already used elsewhere in this modal for a field-gated tab).
- [ ] Opening the tab shows a loading state, then either an error state or the four grouped sections — Frontier ("takeable now"), Claimed, Blocked, Done — each with a visible count.
- [ ] Each ticket row shows: a type badge, the Jira-linked key, a truncated summary, a blocked-by count, and the assignee.
- [ ] Nothing in this ticket writes to Jira (no label, link, or assignee is ever created, changed, or removed).
- [ ] Manually verified against the real fixture Story (already labeled in the user's Jira, see ticket 05) — all four derived states and the two-edge-deep dependency chain render correctly.

## Reference

[Spec](../spec.md) — Implementation Decisions ("Story-level label exposure", "Lazy per-ticket data endpoint", "Ticket data contract", "Derived state computed client-side", "List/fallback view", "Scope boundary: intra-Story only", "Read-only, permanently"). [Ticket 06](06-synthesize-implementation-spec.md) holds the more code-adjacent version of these same decisions (endpoint path, response type shape, exact file/line insertion points) to model new code on directly. [Ticket 03](03-prototype-list-view.md) is the reacted-to list-view prototype this view's grouping/row shape comes from.
