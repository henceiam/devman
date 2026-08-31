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
