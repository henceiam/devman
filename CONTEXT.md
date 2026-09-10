# DevMan

DevMan aggregates Jira and GitHub data to give visibility into the Radicals/Devils teams' backlog, pull requests, and dependency structure.

## Language

**Wayfinder map**:
A Jira Story carrying the `wayfinder:map` label, whose Subtasks are read as a dependency-tracked plan rather than a plain to-do list. DevMan visualizes it read-only; it does not write back to Jira. Distinct from this repo's own local-markdown Wayfinder tracker under `.scratch/` (used to plan DevMan's own features) — the map DevMan visualizes lives entirely in the user's Jira and can represent any project.
_Avoid_: dependency map, roadmap

**Wayfinder ticket**:
A Subtask belonging to a Wayfinder map, typed by a `wayfinder:<type>` label (`research`, `prototype`, `grilling`, or `task`), with dependencies on other tickets expressed via Jira's native `Blocks`/`is blocked by` issue links.
_Avoid_: subtask (when the Wayfinder-specific typing/dependency meaning is intended, not just "a Jira subtask")

**Frontier** (Wayfinder map):
The subset of a Wayfinder map's tickets that are open, unblocked (every ticket blocking them has status Closed), and unassigned — i.e. currently takeable.
_Avoid_: ready, unblocked (alone — frontier also requires open and unassigned)

**Claimed** (Wayfinder ticket):
Derived state, not a Jira field: a ticket has an assignee and its status is not in the Done category.
_Avoid_: assigned, in progress

**Copy-eligible issue**:
An issue in the EBBACKLOG project, of any issue type, carrying the exact case-sensitive label `copy` or `copy-clinical`. Issue type does not determine Copy-tab eligibility.
_Avoid_: Copy Story

**Used milestone**:
A numbered Mission milestone assigned to at least one non-rejected story. Done stories still make a milestone used when their cards are hidden.
_Avoid_: visible milestone (visibility also depends on view mode and filters)

**Visible story** (Mission):
A non-rejected story whose card remains after the current card filters are applied. Visibility affects rendered cards, not milestone existence or complete progress totals.
_Avoid_: active story (can imply Jira workflow state)

**Unassigned milestone**:
The planning group for stories with Jira's `None` milestone value, displayed as **No milestone**. It is distinct from a numbered milestone and is never synthesized.
_Avoid_: None milestone, Milestone 0

**Milestone description**:
Saved planning context attached only to a numbered Mission milestone (`Milestone 1` through `Milestone 10`). A description can make that numbered milestone visible in normal mode even when it has no stories.
_Avoid_: milestone summary

**Synthesized milestone**:
An empty numbered milestone projected for future planning without requiring a Jira milestone entity. It is either Milestone 1 or 2 when no numbered milestone is used, or one of at most two numbered milestones immediately after the highest used numbered milestone, capped at Milestone 10.
_Avoid_: placeholder milestone, persisted milestone
