Type: grilling
Status: resolved

## Question

What does "wayfinder:map" mean in the user's Jira, what should the new DevMan "Wayfinder" tab (on a Story's detail view) show, and how big is this effort's destination — a build, or a spec to hand off?

## Answer

**What a Wayfinder map is (Jira-side, user's own convention — distinct from this repo's own `.scratch/` planning tracker)**:
- A Jira **Story** carries the `wayfinder:map` label. That marks it as a Wayfinder map: its **Subtasks are the map's tickets**.
- Each Subtask (ticket) carries a `wayfinder:<type>` label, one of `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, `wayfinder:task` — mirroring the `/wayfinder` skill's own ticket typing, defined by label rather than any pre-existing Jira mechanism.
- Dependencies between tickets are Jira's **native** `Blocks` / `is blocked by` issue links (not a custom field or naming convention).
- **Claimed** is a derived state, not tracked explicitly in Jira: assignee is set AND status is not in the Done category.
- **Frontier** is derived too: open + unblocked (every blocking ticket Closed) + unassigned.

**Destination for this effort**: a spec ready to hand to a build session — not the shipped feature itself. Wayfinder is planning-by-default and nothing in this ask overrides that.

**What the new tab shows** (Story detail view, `packages/client/src/components/StoryDetailModal.tsx`):
- Tab appears **only** when the open Story has the `wayfinder:map` label (same conditional-tab pattern already used for "Implementation Plan" and "GitHub").
- Lists that Story's Subtasks, each showing: ticket type (from the `wayfinder:<type>` label), Jira status, assignee, dependencies in **both** directions ("blocked by" and "blocks"), and a frontier flag.
- **Read-only** — DevMan never writes back to Jira issue relationships, labels, or assignees for this feature.
- Scope is **self-contained per Story** — cross-Story dependencies are out of scope for v1 (not ruled out forever, just not handled: a Subtask's blocker living in a different Story's subtask tree is not expected/handled).
- **Two views, both required**: a graph (DAG-style, nodes + arrows) as the default, and a list/card view (styled like the existing `SubtaskKanban` cards — avatar chips, `JiraLink`, status badges) reachable via a toggle, as a fallback for stories where the graph layout gets cluttered.

**Not decided here** (left to research/prototype tickets, see map fog): the exact bulk Jira fetch mechanics for subtask `labels`+`issuelinks`, and the concrete visual layout of both views.
