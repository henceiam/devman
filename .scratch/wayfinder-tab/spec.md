Status: ready-for-agent

# Spec: Wayfinder tab for DevMan Story detail view

Collapsed from the [Wayfinder tab map](map.md) — see that map's Decisions-so-far for the full decision trail (tickets 01–06).

## Problem Statement

The user tracks some Jira Stories as **Wayfinder maps** — a dependency-ordered plan of work (a Wayfinder ticket per Subtask, typed `wayfinder:<research|prototype|grilling|task>`, wired together with native Jira `Blocks`/`is blocked by` links) rather than a plain flat to-do list. Today, DevMan's Story detail view shows those Subtasks the same way it shows any other Story's Subtasks: a plain status-column Kanban with no notion of dependency, type, or which tickets are actually takeable right now (the **frontier**). To see the map's real shape — what's blocked on what, what's claimed, what's open to grab — the user has to leave DevMan and read the dependency links directly in Jira's own UI, one issue at a time.

## Solution

Add a **Wayfinder** tab to the Story detail modal (`StoryDetailModal`), visible only when the open Story carries the `wayfinder:map` label. The tab shows that Story's Subtasks as Wayfinder tickets — type, status, assignee, dependencies in both directions, and a derived frontier/claimed/blocked/done state — in two read-only views: a pannable/zoomable dependency graph (default) and a state-grouped list (toggleable fallback, better for large or already-blocked-out maps). DevMan never writes back to Jira for this feature.

## User Stories

1. As a user with a Wayfinder-mapped Story, I want a Wayfinder tab to appear on that Story's detail view, so that I can see its dependency structure without leaving DevMan.
2. As a user viewing a Story that is **not** a Wayfinder map, I want no Wayfinder tab to appear, so that the modal isn't cluttered with an irrelevant view.
3. As a user opening the Wayfinder tab, I want its data to load only when I click into the tab, so that viewing any other Story's Subtasks/Details/Comments doesn't pay the cost of an extra Jira fetch it doesn't need.
4. As a user viewing the Wayfinder tab, I want to see a dependency graph by default, so that I can see the map's shape (blockers, chains, branches) at a glance.
5. As a user viewing the dependency graph, I want each ticket rendered as a node with its summary, type, status, assignee, and frontier flag, so that I can judge a ticket's relevance without opening it.
6. As a user viewing the dependency graph, I want the ticket's Jira key visible but visually de-emphasized, so that the ticket's *content* (summary) takes priority over its identifier.
7. As a user viewing the dependency graph, I want type and frontier shown as small icon badges with a tooltip for the full label, so that dense graphs stay legible without a wall of text on every node.
8. As a user viewing the dependency graph, I want status shown as a colored dot (matching the convention already used elsewhere in DevMan), so that the visual language is consistent across the app.
9. As a user viewing the dependency graph, I want arrows drawn from a blocking ticket to what it blocks, read top-to-bottom, with a short legend stating that convention, so that I don't have to guess the arrow direction.
10. As a user viewing a dense dependency graph, I want to pan and zoom (drag to pan, +/− to zoom) rather than the graph auto-shrinking or relying on scrollbars, so that I can read any node's full content by zooming in, and still get a legible overview by zooming out.
11. As a user viewing a very large or already-cluttered Wayfinder map (roughly 14+ tickets), I want the tab to default to the list view instead of the graph, so that I'm not handed an unreadable graph as my first look.
12. As a user viewing the Wayfinder tab, I want a visible toggle between the graph and list views regardless of which one is shown by default, so that I can always switch to whichever view suits what I'm looking for.
13. As a user viewing the list/fallback view, I want tickets grouped into four sections — Frontier (takeable now), Claimed, Blocked, Done — rather than a flat list or a raw Jira status grouping, so that the grouping reflects the map's actual dependency state, not just Jira's status taxonomy.
14. As a user viewing the list view, I want each section to show a count, so that I can gauge how much work is in each state without counting rows.
15. As a user viewing a ticket row in the list view, I want its type badge, Jira-linked key, truncated summary, blocked-by count, and assignee visible, so that I have enough context to decide whether to open it.
16. As a user viewing the Wayfinder tab in either view, I want a ticket's dependencies computed and shown only within its own Story (not across Stories), so that the feature doesn't fetch or reference issue data outside the Story I'm looking at.
17. As a user viewing the Wayfinder tab, I want a ticket whose blocking ticket lives outside the current Story's Subtask tree to simply have that edge omitted, so that the view never shows a dangling or unresolvable reference.
18. As a user relying on DevMan for read visibility, I want the Wayfinder tab to never create, edit, or remove any Jira label, link, or assignee, so that DevMan stays a safe, read-only viewing tool for this feature.
19. As a developer maintaining DevMan, I want the Wayfinder label/link convention and the frontier/claimed/blocked/done derivation rules documented in the existing Jira tribal-knowledge doc, so that the convention isn't only discoverable by reading this spec or the map.
20. As a developer maintaining DevMan, I want the frontier/claimed/blocked/done derivation logic implemented as a small, directly unit-testable pure function (mirroring `statusUtils.tsx`'s existing pattern), so that its precedence rules (Done > Claimed > Blocked > Frontier) are verifiable without mounting a component or hitting Jira.

## Implementation Decisions

**Story-level label exposure (gates tab visibility).** The Story-detail fetch already used to populate the Story detail modal is extended to also request the Story's own `labels` field from Jira (today only Subtasks carry `labels` in this response; the Story itself does not). This is a one-field addition to an existing always-loaded fetch — no new query. The Story detail response gains a `labels: string[]` field. The client renders the Wayfinder tab button only when that list contains `wayfinder:map`, using the same "conditionally rendered tab" pattern the modal already uses for its Implementation Plan tab (shown only when that field is populated).

**Lazy per-ticket data endpoint.** The dependency/ticket data itself (which requires the more expensive `issuelinks` field) is **not** part of the always-loaded Story detail fetch. It is served from a new endpoint, fetched only when the user first opens the Wayfinder tab — mirroring the existing GitHub tab's lazy-load pattern in this modal exactly (same on-click-then-cache behavior, same loading/error state shape). This keeps the cost of the extra Jira field off every Story detail view that isn't a Wayfinder map.

**Ticket data contract.** The new endpoint returns, per Subtask of the Story: its key, summary, status, status category, assignee (with the existing "Unassigned" sentinel convention), avatar URL, a `type` derived from whichever `wayfinder:<research|prototype|grilling|task>` label is present (`null` if none), and two same-Story-only key lists: `blockedBy` and `blocks`. These lists are built by parsing the Subtask's Jira issue links, keeping only the `Blocks`/`is blocked by` link type (identified by Jira's link-type id, confirmed live against this Jira instance rather than assumed, since link-type strings are admin-editable per instance), and dropping any linked key that isn't one of this Story's own Subtasks. No derived frontier/claimed/blocked/done state is computed or shipped by this endpoint — it returns raw ticket + link data only.

**Derived state computed client-side.** Frontier/Claimed/Blocked/Done is computed entirely in the client, as a pure function taking one ticket and the full ticket list, evaluated in this precedence order:
1. **Done** — the ticket's own status category is Done.
2. **Claimed** — not Done, and it has an assignee.
3. **Blocked** — not Done, not Claimed, and at least one of its `blockedBy` tickets is not itself Done (a missing/unresolvable blocker also counts as unresolved, per the same-Story-only scoping decision above).
4. **Frontier** — none of the above (open, unassigned, and every blocker is Done — including having no blockers at all).

This mirrors the existing convention of centralizing a status-derivation concern in one small, standalone module (as the codebase already does for Jira status → color/label mapping), rather than recomputing it inline in each view component.

**Two required views, one default rule.** The graph view is the default unless the Story has roughly 14 or more Wayfinder tickets, in which case the list view is the default instead — this threshold is a *default selection* heuristic only (chosen before any layout/rendering happens), not a hard cutoff; the toggle between graph and list is always available regardless of which one is shown first.

**Graph view.** A pan-and-zoom canvas (drag to pan, +/− controls to zoom; nodes always render at full size rather than auto-shrinking to fit) is used instead of relying on the modal's own scrollbars or auto-fit-shrinking the whole graph — pan/zoom was chosen specifically because it stays legible at any graph density, verified against both small and dense synthetic datasets during prototyping. Layout is a top-to-bottom layered DAG: a ticket's layer is one more than the deepest layer among its blockers, with unblocked roots at the top; arrows are drawn from each blocking ticket to what it blocks, with a short on-screen legend stating this direction convention once. Each node prioritizes the ticket's summary as the dominant text (multi-line, clamped); type and frontier are shown as small icon-only badges (full label in a tooltip, not on-card text); the Jira key is present but demoted to a small muted label (not a link, not a headline); status is a colored dot reusing the app's existing status-color convention; assignee is a small avatar chip, consistent with how assignees render elsewhere in this modal.

**List/fallback view.** Tickets are grouped into four fixed sections — Frontier ("takeable now"), Claimed, Blocked, Done — each with a visible count, rather than a flat list or a grouping by raw Jira status. Each row shows a type badge, the Jira-linked key, a truncated summary, a blocked-by count, and the assignee — deliberately more compact than the existing Subtask Kanban's full cards, since this view exists specifically to stay usable at higher ticket counts than the graph handles well.

**Scope boundary: intra-Story only.** Dependency edges are computed and shown only among Subtasks of the same Story. A `Blocks`/`is blocked by` link to an issue outside that set (e.g. a Subtask of a different Story) is not surfaced at all — not as a dangling reference, not as an external-link indicator. This is a deliberate v1 boundary (see the map's "Not yet specified": whether cross-Story dependencies ever need supporting is left open for a future effort, not ruled out permanently).

**Read-only, permanently for this feature.** Nothing in the Wayfinder tab writes to Jira — no label, link, or assignee is ever created, changed, or removed by DevMan as part of this feature.

**Documentation.** The `wayfinder:map`/`wayfinder:<type>` label convention, the confirmed `Blocks`/`is blocked by` link-type identity, and the frontier/claimed/blocked/done derivation rules are added as a new section to the existing repo doc that already holds this class of undocumented Jira tribal knowledge (custom fields, link-type quirks, JQL conventions) — not a new standalone doc.

## Testing Decisions

A good test here exercises **observable behavior of the derivation logic**, not implementation plumbing — given a ticket and its blockers' states, does the function return the state a human would call correct, including edge cases (no blockers at all, a blocker missing from the same-Story set, an assigned-but-Done ticket that must resolve to Done and not Claimed).

- **In scope**: the new client-side derive-state function (and the `wayfinder:<type>` label-to-type parser it depends on) get unit tests, following the exact precedent already established by this codebase's other pure-logic test files that sit next to Jira-status-adjacent derivation code (the PR-state parser, and the status→color/label mapping module) — same test runner, same "one small file of pure functions, one test file beside it" shape.
- **Out of scope, deliberately, matching existing repo convention**: the new backend endpoint and its issue-link parsing are not unit tested. The server package has no test suite today, and no existing service-layer issue-link parsing (including the closest precedent already in this codebase) is unit tested either — this feature does not introduce a new testing seam the rest of the server package doesn't have.
- **Out of scope**: no new tests for the two view components (graph, list) or the tab container itself — this codebase does not unit- or component-test its view/rendering layer today (only pure derivation/formatting logic gets tests), and this feature follows that same line.

## Out of Scope

- Cross-Story dependency edges (a blocker or blocked ticket living in a different Story's Subtask tree) — explicitly deferred, not designed against; may become its own future effort if it turns out to matter in practice.
- Any write path back to Jira (setting labels, creating/removing issue links, assigning tickets) from within DevMan for this feature.
- Automated testing of the new backend endpoint, or of either view component / the tab container — consistent with this repo's existing testing footprint (server package untested; only pure client-side logic modules get unit tests).
- Precise interaction-library choice for the pan/zoom canvas, exact spacing/Tailwind class decisions beyond matching existing card/badge/dot conventions already in this modal, and the literal numeric ticket-count/fit-scale threshold constant — left to the implementing session's judgment within the qualitative rule stated above (roughly 14+ tickets favors defaulting to the list view).

## Further Notes

- Full decision trail and prior-art references (specific files/line numbers to model new code on, the two full three-variant prototypes that were built and reacted to live, and the real Jira fixture Story used for testing) live in the [Wayfinder tab map](map.md) and its child tickets — particularly [ticket 06](issues/06-synthesize-implementation-spec.md), which holds a more code-adjacent version of every decision above (endpoint path, response type shape, exact file/line insertion points) for the implementing session to consult directly rather than re-deriving.
- The fixture Story to build and manually verify against is already labeled in the user's real Jira (see [ticket 05](issues/05-apply-example-labels.md)) and exercises all four derived states plus a two-edge-deep dependency chain.
