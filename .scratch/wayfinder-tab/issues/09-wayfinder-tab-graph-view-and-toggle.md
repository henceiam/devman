# 09: Wayfinder tab — graph view + view toggle

**What to build:** The pan-and-zoom dependency graph as the Wayfinder tab's default view, plus a visible Graph/List toggle and the default-selection heuristic that favors the list view for large maps.

**Blocked by:** 08 (needs the ticket-data endpoint, tab container, and derived-state function already in place — a graph with no ticket/derived-state data to render isn't independently demoable)

**Status:** ready-for-agent

- [ ] The Wayfinder tab defaults to the graph view, except when the Story has roughly 14 or more Wayfinder tickets, in which case it defaults to the list view instead. This is a default-selection heuristic only, evaluated before any layout/rendering happens — not a hard cutoff.
- [ ] A visible toggle lets the user switch between graph and list views regardless of which one is shown first.
- [ ] The graph is a pan-and-zoom canvas: drag to pan, +/− controls to zoom, nodes always render at full size (no auto-shrink-to-fit).
- [ ] Layout is a top-to-bottom layered DAG: a ticket's layer is one more than the deepest layer among its blockers; unblocked roots sit at the top.
- [ ] Arrows are drawn from each blocking ticket to what it blocks, with a short on-screen legend stating this direction convention once.
- [ ] Each node prioritizes the ticket's summary as the dominant, multi-line-clamped text.
- [ ] Type and frontier are shown as small icon-only badges on the node, with the full label available in a tooltip (not on-card text).
- [ ] The Jira key is present on the node but visually demoted (small, muted, not a link, not a headline).
- [ ] Status is shown as a colored dot, reusing the same status-color convention already used elsewhere in this modal.
- [ ] Assignee is shown as a small avatar chip, consistent with how assignees render elsewhere in this modal.
- [ ] Nothing in this ticket writes to Jira.
- [ ] Manually verified against the real fixture Story (ticket 05) and against a denser synthetic dataset to confirm both the default-selection heuristic and pan/zoom legibility at higher ticket counts.

## Reference

[Spec](../spec.md) — Implementation Decisions ("Two required views, one default rule", "Graph view"). [Ticket 06](06-synthesize-implementation-spec.md) for the code-adjacent version of these decisions. [Ticket 04](04-prototype-graph-view.md) is the reacted-to graph-view prototype this node design, layout, and overflow-handling approach come from — including the ~14-ticket / ~55%-fit-scale threshold data point the default-selection heuristic above is based on.
