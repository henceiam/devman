---
applyTo: "**"
---

# Domain Logic

## Jira Custom Field Map

This is the most critical domain knowledge — **undocumented tribal knowledge** about which Jira custom field IDs map to what:

| Custom Field ID | Domain Name | Type | Used On | Notes |
|---|---|---|---|---|
| `customfield_10000` | Pull Requests | String (embedded JSON) | Story, SubStory | Jira's dev info field; contains `json={...}` with PR summary |
| `customfield_10002` | Epic Short Name | String | Epic | Short display name for the epic |
| `customfield_10116` | Rank | String | All issues | Jira's ranking field for ordering |
| `customfield_11100` | Flagged | Boolean/Array | All issues | Whether the issue is flagged |
| `customfield_11101` | Acceptance Criteria | String/ADF | All issues | AC text or rich text |
| `customfield_11104` | Target Date | Date string | Story | Used for copy/translation countdown |
| `customfield_11302` | Copy Status | `{ value: string }` | EBBACKLOG issues | Translation workflow status (see Copy Status values below) |
| `customfield_11285` | Translation keys | ADF document | EBBACKLOG issues | Read-only in DevMan when populated; Copy-eligible issues can initialize an empty value from the canonical table template |
| `customfield_11357` | Size/Estimate | `{ value: "XS"\|"S"\|"M"\|"L"\|"XL" }` | All issues | T-shirt size estimate |
| `customfield_11465` | Hidden Date | Date string | Epic, Story | If set and in the future, hides the item from dashboards |
| `customfield_11477` | Milestone | `{ value: string }` | Story | Which milestone row the story belongs to (e.g., "Milestone 1", "Out of scope") |
| `customfield_11487` | Mapping / Category | String | Epic (as JSON), Story (as column name) | On Epics: JSON config `{"category": {"Col1": ..., "Col2": ...}}`. On Stories: the category column name. |
| _(checkboxes field)_ | Product Team | Checkboxes | All issues | JQL syntax: `"Product teams[Checkboxes]" in (Radicals)` — NOT `= "Radicals"` |

### Copy Status Values (`customfield_11302.value`)

| Value | Meaning | Color |
|---|---|---|
| `Copy - ready to start` | Copy needs to be written | `lightblue` |
| `Copy - in progress` | Copy being written | `lightblue` |
| `Translation - ready to start` | Ready for translation | `#fcd345` (yellow) |
| `Translation - in progress` | Being translated | `#fcd345` (yellow) |
| `Translation - done` | Translation complete | `#5b5` (green) |

### Milestone Values (used in edit modal)

```
None, Milestone 1, Milestone 2, ..., Milestone 10, Out of scope
```

### Size/Estimate Values

```
XS, S, M, L, XL
```

### Story Status Colors

| Status | Color | Category |
|---|---|---|
| `Request`, `To do` | `white` (rendered as `#9ca3af` gray dot — white is invisible on white bg) | Backlog |
| `To Refine` | `lightsteelblue` | Refinement |
| `In Design`, `Ready for Design` | `violet` | Design |
| `READY FOR DEVELOPMENT`, `To Investigate` | `cornflowerblue` | Ready |
| `In Progress`, `Under investigation`, `On Hold` | `sandybrown` | Active |
| `Code review`, `Ready for test`, `In Test`, `Waiting for support`, `Waiting for customer` | `khaki` (rendered as `#d4b44a` — raw khaki is near-white) | Review/Test |
| `Ready for Deploy` | `yellowgreen` | Deploy |
| `Closed` | `lightgreen` | Done |
| `Rejected` | `gray` | Rejected |
| _(default/unknown)_ | `lightred` | — |

### SubTask Status Colors (simplified 3-bucket)

| Statuses | Color | Meaning |
|---|---|---|
| `Request`, `To Refine`, `In Design`, `READY FOR DEVELOPMENT` | `royalblue` | Todo |
| `In Progress`, `Code review`, `Ready for test` | `coral` | Doing |
| `Closed` | `forestgreen` | Done |
| `Rejected` | `gray` | Rejected |
| _(default)_ | `crimson` | — |

### Status Category Sort Order

| Key | Order | Meaning |
|---|---|---|
| `new` | 0 | Not started |
| `indeterminate` | 1 | In progress |
| `done` | 2 | Completed |

---

## Teams & Projects

- **Product team**: The "Radicals" team is the primary team tracked in DevMan. JQL filter: `"Product teams[Checkboxes]" in (Radicals)`.
- **EBBACKLOG**: Main engineering backlog project. All custom fields above apply here.
- **SUPPORT**: Customer support ticket project. Linked from EBBACKLOG issues via `issuelinks`. Support tickets use standard Jira fields only (summary, status, priority).

---

## Escalated Support Tickets

- **Escalation label**: `issue-escalated-succesfully` — note the intentional typo (single 's' in "successfully"). Must be preserved exactly.
- Escalated tickets are EBBACKLOG issues with this label that are **not Done**.
- Each escalated ticket typically has an `issuelinks` entry pointing to a SUPPORT project ticket.
- Full JQL: `project = "EBBACKLOG" AND labels = "issue-escalated-succesfully" AND "Product teams[Checkboxes]" in (Radicals) AND statusCategory != Done ORDER BY priority ASC, updated DESC`

---

## Wayfinder Maps

The user tracks some work as **Wayfinder maps** — a dependency-ordered plan of tickets, distinct from any Jira mechanism built for this purpose. This is a labeling + native-issue-link convention layered on top of ordinary Stories and Subtasks:

- **`wayfinder:map`** — a Story label. Marks that Story as a Wayfinder map; its **Subtasks are the map's tickets**.
- **`wayfinder:<research|prototype|grilling|task>`** — a Subtask label, one per Subtask, giving that ticket's type. Mirrors the `/wayfinder` skill's own ticket typing, defined purely by label (no other Jira field carries it).

**Dependencies** between Wayfinder tickets are Jira's **native** `Blocks`/`is blocked by` issue links — not a custom field or naming convention. Confirmed live against this Jira instance (via `getIssueLinkTypes`/`getJiraIssue`): the link type is `id: "10000"`, `name: "Blocks"`, `inward: "is blocked by"`, `outward: "blocks"`. Each `issuelinks` entry carries either an `inwardIssue` or `outwardIssue` (never both) — same shape already parsed for SUPPORT ticket links (see Jira API Notes below). Link-type `name`/`inward`/`outward` strings are admin-editable per Jira instance, so if this ever needs re-verifying, key on the link-type **id** (`10000`), which is the more robust identifier.

**Derived state** (Frontier/Claimed/Blocked/Done) is never tracked explicitly in Jira — it's computed from status, assignee, and blocker state, in this precedence order:

1. **Done** — the ticket's own status category is Done.
2. **Claimed** — not Done, and it has an assignee.
3. **Blocked** — not Done, not Claimed, and at least one of its blockers is not itself Done.
4. **Frontier** — none of the above (open, unassigned, every blocker Done — including having no blockers at all).

**Scope boundary**: dependency edges are resolved **within a single Story's own Subtask set only**. A `Blocks`/`is blocked by` link to an issue outside that set (e.g. a Subtask of a different Story) is dropped entirely, not surfaced as a dangling or external reference.

---

## PR State Detection (`customfield_10000`)

The raw string in `customfield_10000` encodes Jira's dev info. Parse rules (in priority order):

1. **PRs** — look for `"stateCount": N` (N > 0) in embedded JSON, paired with `"state": "OPEN|MERGED|DECLINED|DRAFT"`.
2. **Fallback PR check** — look for top-level `pullrequest={...stateCount=N}` in the outer string.
3. **Branch only** — if no PR found, look for `branch={count=N}` (N > 0) in the outer string.
4. **Nothing** — return `null`.

PR states map to: `open`, `merged`, `declined`, `draft`, `unknown`, `branch`.

GitHub API (`/rest/dev-status/latest/issue/detail?issueId={numericId}&applicationType=GitHub&dataType=pullrequest`) returns richer PR data including reviewer info. Use numeric issue ID (not key).

If GitHub API fails (e.g. private repo), build a `PrDetail` from Jira dev-status data as fallback rather than returning null — so merged PRs still appear.

---

## Jira API Notes

- **Search method**: Always use `searchForIssuesUsingJqlEnhancedSearch` — the old `searchForIssuesUsingJql` returns HTTP 410 Gone.
- **Issue links**: Fetched via the `issuelinks` field. Each link has `inwardIssue` or `outwardIssue` (one will be null). Check `linked.key.startsWith("SUPPORT")` to find linked support tickets.

---

## Scope & Behavior Notes

- **Applicable project**: `EBBACKLOG` — the custom fields and status logic above apply to this project. Other Jira projects use standard fields only.
- **Mapping/Category relationship**: The Epic's `customfield_11487` JSON defines the valid category columns. Child Stories reference one of those columns by name in their `customfield_11487` value. It's a parent-child config pattern.
- **PR cross-referencing**: DevMan cross-references Jira's `customfield_10000` with GitHub Octokit API to get reviewer details, approval state, stats, and labels. Use `listRequestedReviewers` (not `listReviewRequests` — that method does not exist).
- **Copy Status**: Display only — show as a status badge on issues, no active pipeline tracking needed.
- **Copy eligibility**: Any EBBACKLOG issue type, including Subtasks, is eligible when it carries the exact, case-sensitive label `copy` or `copy-clinical`. Issue type is not part of the eligibility rule.
- **Hidden Date**: Behavior when date passes is TBD — defer implementation details for later.
- **"In progress" definition** for Launchpad: statuses `In Progress`, `Code review`, `Ready for test`.

---

## Client-Side Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `JIRA_HOST` | Server-side Jira API base URL |
| `VITE_JIRA_HOST` | Client-side Jira host for building `/browse/{key}` links (must have `VITE_` prefix to be exposed to browser) |
| `VITE_LAUNCHPAD_REFRESH_MS` | Auto-refresh interval for Launchpad page in milliseconds (default: `300000` = 5 min) |
| `SERVER_PORT` | Express server port |
| `CLIENT_PORT` | Vite dev server port |
| `GITHUB_TOKEN` | GitHub PAT for Octokit API calls |
| `JIRA_EMAIL` | Jira Cloud account email |
| `JIRA_API_TOKEN` | Jira Cloud API token |

---

## Key UI Patterns & Implementation Notes

- **JiraLink component** (`src/components/JiraLink.tsx`): Renders any issue key as a `target="_blank"` link to `{VITE_JIRA_HOST}/browse/{key}`. Uses `e.stopPropagation()` so it does not trigger parent card/row click handlers. Use this everywhere an issue key is displayed.
- **Status colours**: Applied as inline styles (not Tailwind classes) via `getStatusStyle(status)` in `statusUtils.tsx`, which returns `{ dotColor, bgColor }`. `bgColor` is a pre-computed `rgba(...)` tint for card backgrounds.
- **Story card click vs drag**: `StoryCard` uses pointer coordinates to distinguish a drag from a click — only fires `onSelect` if pointer moved < 5px.
- **Route ordering in Express**: Specific subroutes (e.g., `/stories/:key/github`) must be registered **before** wildcard routes (e.g., `/stories/:key`) or Express captures the suffix as the param.
- **"No milestone" and "Out of scope" milestones**: Rendered with an orange tint background (`border-orange-200 bg-orange-50`) and collapsed by default in milestone list views.
