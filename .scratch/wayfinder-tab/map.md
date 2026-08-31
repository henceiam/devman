# Map: Wayfinder tab for DevMan Story detail view

## Destination

A spec ready to hand to a build session for a new **Wayfinder** tab on DevMan's Story detail view (`packages/client/src/components/StoryDetailModal.tsx`). The tab appears only when the open Story carries the `wayfinder:map` Jira label, and shows that Story's Subtasks as Wayfinder tickets — type, status, assignee, dependencies (both directions), and a derived frontier flag — in two read-only views: a dependency graph (default) and a list/card fallback (toggle), consistent with the app's existing look.

## Notes

- Domain vocabulary for this effort lives in [CONTEXT.md](../../CONTEXT.md) (Wayfinder map, Wayfinder ticket, Frontier, Claimed) — read it before touching any ticket here.
- Jira field/query conventions: [.github/instructions/domain-logic.instructions.md](../../.github/instructions/domain-logic.instructions.md) (always `searchForIssuesUsingJqlEnhancedSearch`, issue-link shape, etc.)
- Standing preference: **read-only**. Nothing in this effort writes back to Jira (no new labels, links, or assignees set by DevMan).
- Standing preference: **self-contained per Story** — cross-Story dependencies are out of scope for v1, not handled.
- Grilling/prototype tickets on this map: call the Skill tool for `grilling` and/or `domain-modeling` as needed (per the `/wayfinder` skill itself), and for `prototype` tickets, the `prototype` skill.

## Decisions so far

- [Define what a Wayfinder map is and what the tab scope is](issues/01-define-wayfinder-map-and-tab-scope.md): `wayfinder:map` label on a Story, `wayfinder:<type>` labels + native Jira `Blocks` links on its Subtasks, frontier/claimed are derived (not stored), read-only, self-contained per Story, both a graph (default) and list (fallback) view are in scope for v1.
- [Bulk-fetch feasibility for subtask dependencies](issues/02-bulk-fetch-feasibility.md): one field addition (`issuelinks`) to the existing bulk subtask query in `missions.ts` — no new query, no per-subtask calls; `labels` was already being fetched. Caveat: verify the real "Blocks" link-type strings against the live Jira instance before hardcoding them.
- [Prototype the list/card fallback view](issues/03-prototype-list-view.md): Variant B won outright — group tickets by derived state (Frontier / Claimed / Blocked / Done), not a flat list or table. Full 3-variant prototype archived at [prototypes/03-list-view-variants.tsx](prototypes/03-list-view-variants.tsx).
- [Prototype the default graph/DAG view](issues/04-prototype-graph-view.md): Variant B — pan & zoom canvas — won for overflow handling; scales to dense graphs via drag/zoom instead of scrolling or auto-shrinking. Card content redesigned per live feedback: name/summary prioritized, type + frontier as icon-only badges, key deprioritized to a muted label, status as a colored dot. ~14+ tickets (or <55% fit-to-view) is the rule-of-thumb threshold to prefer the list view instead. Full 3-variant prototype archived at [prototypes/04-graph-view.tsx](prototypes/04-graph-view.tsx).
- [Apply example labels](issues/05-apply-example-labels.md): Test fixture is [EBBACKLOG-26329](https://doctrin.atlassian.net/browse/EBBACKLOG-26329) with 4 subtasks covering all four derived states (Frontier/Claimed/Blocked/Done) and a 2-deep dependency chain. Confirmed live against the real Jira instance: "Blocks" link type is `id: "10000"`, `inward: "is blocked by"`, `outward: "blocks"` — closes ticket 02's caveat, no pre-build verification step needed.

## Not yet specified

- Whether cross-Story dependencies ever need supporting is deliberately not ruled out-of-scope (v1 just doesn't handle it) — if it turns out to matter in practice, that's a future map, not a graduation of this one.

## Out of scope

(none yet)
