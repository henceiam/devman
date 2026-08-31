Type: prototype
Status: resolved
Blocked by: 01

## Question

What should the default graph (DAG-style, nodes + arrows) view of the Wayfinder tab look like? Build a rough, reactable mock (can use synthetic/mock dependency data — doesn't need to wait on ticket 02 or 05), legible inside the existing Story detail modal's content area (`packages/client/src/components/StoryDetailModal.tsx`, a `max-w-3xl` modal with a scrollable body). Cover: node content (ticket key, type, status, assignee), edge direction convention, how frontier tickets are visually flagged, and what happens when the graph doesn't fit (pan/zoom vs. shrink vs. scroll) — the answer should also say when this view gets too cluttered to be useful, since the list view (ticket 03) exists as the fallback for exactly that case.

## Answer

**Verdict: Variant B — "Pan & zoom canvas"** for handling overflow, with a node-content redesign layered on top per live user feedback.

Three structurally different overflow-handling approaches were built and reacted to live in the app (mounted as a dev-only "Wayfinder (dev)" tab on a real Story via `?wf=A|B|C`, synthetic ticket data, small (7) and dense (24) datasets toggled via `?wfdata=`):

- **A — Scroll only**: plain layered DAG, relies on the modal's own horizontal/vertical scrollbars. Rejected — not tried further once B won.
- **B — Pan & zoom canvas** (winner): fixed-height viewport, drag to pan, +/- buttons to zoom, nodes always render full-size. Scales to any graph density (verified against the 24-ticket dense dataset — zooming out gives a legible overview, zooming in reads any node's full name) at the cost of one extra interaction (zoom out) for a first look.
- **C — Auto-fit shrink + clutter banner**: whole graph auto-scaled to fit a fixed viewport, no interaction needed, but an explicit banner appears past ~14 tickets or a fit-scale below ~55% pointing at the list view as fallback. Useful data point even though not chosen: confirms roughly where a graph becomes unreadable, which is a reasonable clutter threshold to carry forward even under Variant B (see below).

**Node content, after live iteration** (initial mock had a full type-label pill, a prominent Jira-linked key, and a full "Frontier" text pill — user feedback: no room for text, and the wrong things were prioritized):
- **Summary/name is the priority** — largest text on the card, gets the most space (2-line clamp).
- **Type and Frontier are icon-only badges** (small colored circle + icon, e.g. flask for prototype, flag for frontier) — the full label lives in a tooltip, not on-card.
- **Ticket key is deprioritized** — a small muted mono label in the header row, not a link, not a headline.
- **Status is a colored dot** (reusing `getStatusStyle`'s `dotColor`, the same convention `StoryCard`/`SubtaskKanban` already use), not a text badge.
- **Assignee** stays a small avatar chip (initials or photo), consistent with the rest of the app.

**Edge direction convention**: arrows point from a blocker to what it unblocks, read top-to-bottom (a small legend line states this above the graph) — matches the layered layout, where a ticket's layer = 1 + max(layer of its blockers), roots (no blockers) at the top.

**When it gets too cluttered**: even under the winning Pan & Zoom variant, treat **~14+ tickets, or needing to shrink below ~55% to fit a first-glance view, as the practical threshold** where the list view (ticket 03) should be offered/preferred — this number came from Variant C's own auto-fit math and held up as a reasonable rule of thumb regardless of which overflow strategy is used.

**Primary source** (all 3 variants, the card redesign, and the switcher, as built and reacted to): [prototypes/04-graph-view.tsx](../prototypes/04-graph-view.tsx). This was mounted live during the prototype session as a dev-only tab in `StoryDetailModal.tsx`; that wiring has been reverted out of the live app (no half-built feature should sit in main before the real backend/data work lands) — the archived file is the record of what was built and shown, not live code.

**Carries into the eventual build**: implement the real Wayfinder tab's default graph view as a pan/zoom canvas (drag to pan, +/- zoom, full-size nodes), with cards prioritizing the ticket name, icon-only type/frontier badges, a muted key, a status dot, and an avatar. Exact componentization and the precise clutter-threshold constant are left to the build session, not specified further here.
