Type: task
Status: resolved
Blocked by: 01

## Question

Apply the `wayfinder:map` label to one real Jira Story, and `wayfinder:<research|prototype|grilling|task>` labels plus a few `Blocks`/`is blocked by` links to a handful of its Subtasks — enough to give a real example to build and test the Wayfinder tab against, and to confirm against real data (not just docs) what Jira's `issuelinks` response actually looks like for this link type.

This is manual work only the user can do in their own Jira; record which Story/Subtasks were used as the answer, since later work will point at it as the test fixture.

## Answer

**Fixture story**: [EBBACKLOG-26329 "Tele2 SMS integration — Discovery & Planning"](https://doctrin.atlassian.net/browse/EBBACKLOG-26329), labeled `wayfinder:map`, unassigned, status Request.

**Subtasks (Wayfinder tickets)**:

| Key | Type label | Status | Assignee | Links | Derived state |
|---|---|---|---|---|---|
| [EBBACKLOG-26330](https://doctrin.atlassian.net/browse/EBBACKLOG-26330) | `wayfinder:task` | Request | none | blocks EBBACKLOG-26333 | Frontier |
| [EBBACKLOG-26331](https://doctrin.atlassian.net/browse/EBBACKLOG-26331) | `wayfinder:research` | Closed | none | blocks EBBACKLOG-26332, blocks EBBACKLOG-26333 | Done |
| [EBBACKLOG-26332](https://doctrin.atlassian.net/browse/EBBACKLOG-26332) | `wayfinder:task` | Request | Rickard Rosenberg | is blocked by EBBACKLOG-26331 (resolved) | Claimed |
| [EBBACKLOG-26333](https://doctrin.atlassian.net/browse/EBBACKLOG-26333) | `wayfinder:grilling` | Request | none | is blocked by EBBACKLOG-26330, is blocked by EBBACKLOG-26331 | Blocked |

Between them the fixture exercises all four derived states from the list-view prototype (Frontier / Claimed / Blocked / Done) and a two-edge-deep dependency chain (26330 & 26331 → 26333) for the graph view.

**`issuelinks` shape confirmed live** (via `getIssueLinkTypes` and `getJiraIssue`, read-only): the "Blocks" link type is `id: "10000"`, `name: "Blocks"`, `inward: "is blocked by"`, `outward: "blocks"` — exactly as assumed in ticket 02, now verified against the real Jira instance rather than docs. Each `issuelinks` entry carries either an `inwardIssue` or `outwardIssue` (never both), matching the shape `launchpad.ts` already parses for SUPPORT tickets. This closes ticket 02's open caveat — the build spec (ticket 06) can hardcode `type.name === "Blocks"` (or `type.id === "10000"`) without a pre-build verification step.
