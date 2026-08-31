Type: research
Status: resolved
Blocked by: 01

## Question

Can a Story's Subtasks be fetched with their `labels` and `issuelinks` (for `Blocks`/`is blocked by` links) in the same bulk Jira query DevMan already runs to build `SubtaskItem[]` (see `packages/server/src/services/missions.ts`, around where `subtasks: SubtaskItem[]` is populated) — or does getting dependency links per subtask require a separate call per subtask (N+1)?

Investigate:
- Does `searchForIssuesUsingJqlEnhancedSearch` (the required search method per [.github/instructions/domain-logic.instructions.md](../../../.github/instructions/domain-logic.instructions.md)) accept `issuelinks` and `labels` in its `fields` list for a subtask-scoped JQL, same as it's already requested for other issue types (see `packages/server/src/services/launchpad.ts` line ~85 for an existing example of requesting `issuelinks`)?
- What shape does the Jira Cloud REST API return for `issuelinks` here — same `inwardIssue`/`outwardIssue` shape used for SUPPORT ticket links today? Confirm the link `type.name` value used for "Blocks" (Jira's default is literally `"Blocks"`, but confirm against a real response if a live example exists per ticket 05).
- If bulk fetch isn't possible for some reason (field limits, permissions), what's the cheapest fallback (e.g. one extra JQL query for just the Story's subtasks with `issuelinks`, rather than per-subtask REST calls)?

Recommend a concrete fetch approach and (if a new/changed endpoint is warranted) its response shape, as the answer.

## Answer

Full findings: [research/02-bulk-fetch-feasibility-findings.md](../research/02-bulk-fetch-feasibility-findings.md).

**Add `"issuelinks"` to the existing subtask `fields` array** in `getStoryDetail()` at `packages/server/src/services/missions.ts:441` — the same single bulk `searchForIssuesUsingJqlEnhancedSearch` call already used for every other subtask field. No second query, no per-subtask REST calls. Confirmed via jira.js's actual vendored types (`fields?: string[]`, no allow-list) and this repo's own precedent (`launchpad.ts:83-87` already combines `issuelinks` with several other fields in one bulk call).

Bonus finding: **`labels` is already fetched and mapped for subtasks today** (`missions.ts:441`, `:458`, `SubtaskItem.labels` at `:75`) — nothing left to do there; only `issuelinks` is a net-new field to request.

Parse `issuelinks` the same way `launchpad.ts:100-120` already does (`type.name`/`type.inward`/`type.outward`, `inwardIssue ?? outwardIssue`), filtered to keys inside the Story's own `subtaskKeys` set (`missions.ts:434`) so only intra-story edges surface.

**Caveat carrying forward into the build**: Jira's default "Blocks" link type is `name: "Blocks"`, `outward: "blocks"` (confirmed via Atlassian's own support docs), but the exact `inward` string ("is blocked by") was not independently verified in this session, and all of `name`/`inward`/`outward` are admin-editable per Jira instance. Before hardcoding these strings, verify against the real DevMan Jira instance (`GET /rest/api/3/issueLinkType`, or the `getIssueLinkTypes` Atlassian MCP tool) — prefer keying on `type.id` if in doubt. This dovetails with ticket 05 (real Jira example), which will surface the actual strings in practice.
