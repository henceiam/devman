Type: prototype
Status: resolved
Blocked by: 01

## Question

What should the list/card fallback view of the Wayfinder tab look like? Build a rough, reactable mock (can use synthetic/mock dependency data — doesn't need to wait on ticket 02 or 05) styled consistently with the existing `SubtaskKanban` cards in `packages/client/src/components/StoryDetailModal.tsx` (avatar chips, `JiraLink`, status badges), showing per ticket: type badge/icon (from `wayfinder:<type>`), status, assignee, "blocked by" / "blocks" lines, and a clear frontier flag for takeable tickets.

## Answer

**Verdict: Variant B — "Grouped by frontier state" — wins outright**, no grafting from A or C.

Three structurally different variants were built (flat annotated cards, grouped-by-derived-state sections, dense dependency table) and reacted to live in the app (mounted as a dev-only tab on a real Story via `?wf=A|B|C` cycling, synthetic ticket data). The user's call: B, cleanly, no mixing.

B's shape: four sections — **Frontier — takeable now**, **Claimed**, **Blocked**, **Done** — each a collapsible-looking group with a count, tickets rendered as compact rows (type badge, `JiraLink`, truncated summary, blocked-by count, assignee) rather than full cards. This reorganizes by *derived state* (frontier/claimed/blocked/done) rather than raw Jira status or a flat chronological list — matches the actual point of a dependency map: seeing at a glance what's takeable now.

**Primary source** (all 3 variants + the switcher, as built and reacted to): [prototypes/03-list-view-variants.tsx](../prototypes/03-list-view-variants.tsx). This was mounted live during the prototype session as a dev-only tab in `StoryDetailModal.tsx`; that wiring has been reverted out of the live app (no half-built feature should sit in main before the real backend/data work lands) — the archived file is the record of what was built and shown, not live code.

**Carries into the eventual build**: implement the real Wayfinder tab's list/fallback view using B's section-grouping structure (Frontier/Claimed/Blocked/Done), not a flat list. Exact componentization (e.g. reusing `SubtaskKanban`'s card internals vs. the compact-row style shown here) is left to the build session, not specified further here.
