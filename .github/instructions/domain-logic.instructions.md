---
applyTo: "**"
---

# Domain Logic

<!-- 
  Paste your domain logic from the previous project below.
  This file is automatically loaded by Copilot for every session in this repo.
  
  Suggested sections:

  ## Data Model
  Describe key entities, their relationships, and important fields.
  e.g., how Jira projects/issues map to your internal concepts,
  how GitHub repos/PRs relate to teams and delivery tracking.

  ## Business Rules
  Document the rules and calculations that drive your tracking.
  e.g., how you measure progress, what counts as "done",
  how you aggregate developer activity, SLA definitions.

  ## Terminology
  Define domain-specific terms so Copilot uses consistent language.
  e.g., "sprint velocity", "backlog health", "PR cycle time".

  ## Workflows
  Describe key workflows and state machines.
  e.g., issue lifecycle, PR review flow, release process.
-->

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
| `customfield_11302` | Copy Status | `{ value: string }` | Story | Translation workflow status (see Copy Status values below) |
| `customfield_11357` | Size/Estimate | `{ value: "XS"\|"S"\|"M"\|"L"\|"XL" }` | All issues | T-shirt size estimate |
| `customfield_11465` | Hidden Date | Date string | Epic, Story | If set and in the future, hides the item from dashboards |
| `customfield_11477` | Milestone | `{ value: string }` | Story | Which milestone row the story belongs to (e.g., "Milestone 1", "Out of scope") |
| `customfield_11487` | Mapping / Category | String | Epic (as JSON), Story (as column name) | On Epics: JSON config `{"category": {"Col1": ..., "Col2": ...}}`. On Stories: the category column name. |

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
| `Request`, `To do` | `white` | Backlog |
| `To Refine` | `lightsteelblue` | Refinement |
| `In Design`, `Ready for Design` | `violet` | Design |
| `READY FOR DEVELOPMENT`, `To Investigate` | `cornflowerblue` | Ready |
| `In Progress`, `Under investigation`, `On Hold` | `sandybrown` | Active |
| `Code review`, `Ready for test`, `In Test`, `Waiting for support`, `Waiting for customer` | `khaki` | Review/Test |
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

## Scope & Behavior Notes

- **Applicable project**: `EBBACKLOG` — the custom fields and status logic above apply to this project. Other Jira projects use standard fields only.
- **Mapping/Category relationship**: The Epic's `customfield_11487` JSON defines the valid category columns. Child Stories reference one of those columns by name in their `customfield_11487` value. It's a parent-child config pattern.
- **PR cross-referencing**: DevMan should cross-reference Jira's `customfield_10000` (embedded PR data) with GitHub API PR data to link Jira issues to GitHub pull requests.
- **Copy Status**: Display only — show as a status badge on issues, no active pipeline tracking needed.
- **Hidden Date**: Behavior when date passes is TBD — defer implementation details for later.