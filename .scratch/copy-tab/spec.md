# Copy tab for issue details — implementation-ready specification

This is the deliverable of the copy-tab wayfinding map. It assembles the map's three resolved decisions into a specification that leaves no design decisions for implementation. It is **planning only**: implementation is out of scope for the map and follows as a separate effort.

Decisions assembled here (detail lives on each ticket, not restated beyond what's needed to implement):

- [Establish the reference table and Jira field schema](issues/01-establish-reference-table-and-field-schema.md) — field schemas and the canonical ADF template.
- [Decide the safe Jira read/write contract](issues/02-decide-safe-jira-read-write-contract.md) — eligibility, read contract, the initialize command, and typed outcomes.
- [Decide the Copy tab presentation](issues/03-decide-copy-tab-presentation.md) — the field-sections layout and all interaction states.

## Feature summary

Add a **Copy** tab to the existing story/issue detail modal. For an eligible EBBACKLOG issue it shows two read-only Jira fields — Copy & Translations (`customfield_11302`) and Translation keys (`customfield_11285`, an ADF textarea) — and, when Translation keys is empty, a one-click action that initializes it with the canonical Key/Copy/Comment table from EBBACKLOG-25185 without overwriting concurrently written content.

## Eligibility

A Copy-eligible issue:

- belongs to project `EBBACKLOG`;
- has any issue type, including Epic, Story, Task, Bug, or Subtask; and
- carries the exact, case-sensitive label `copy` or `copy-clinical`.

The **server independently enforces** project and label eligibility. The client hiding the tab or action is not a data-integrity boundary.

## Contract

### Read

The existing issue-detail response gains `copy: IssueCopyData`. All new types use issue-neutral names. Types are **duplicated by hand** between server and client in this codebase; add `IssueCopyData` to both `packages/server/src/services/missions.ts` and `packages/client/src/api/client.ts` and keep them in lockstep.

```ts
interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  [key: string]: unknown;
}

interface AdfDocument extends AdfNode {
  type: "doc";
  version: 1;
  content: AdfNode[];
}

interface IssueCopyData {
  status: string | null;
  translationKeys: AdfDocument | null;
  translationKeysState: "empty" | "initialized";
}
```

- `status` is `customfield_11302.value`, or `null`.
- `translationKeys` is the valid Jira ADF document, or `null` when missing, null, structurally contentless, or malformed.
- The server validates only the ADF invariants DevMan relies on — a `doc` root, `version` `1`, array `content` — and preserves all recognized and unrecognized nodes, marks, and attributes unchanged.
- The server computes `translationKeysState` using the agreed empty-content rule: missing, null, and structurally contentless ADF count as empty; an existing table counts as `initialized` even when all its cells are blank. The client does not independently decide whether initialization is legal.

### Initialize command

```http
POST /api/missions/issues/:issueKey/copy/translation-keys/initialize
```

No request body. The browser sends neither the reference ADF nor an assertion that the field is empty; **the server owns the canonical EBBACKLOG-25185-derived template** (reproduced in full in [research/reference-table-and-field-schema.md](research/reference-table-and-field-schema.md)).

For each request the server:

1. Fetches the issue's project, labels, and current `customfield_11285` value from Jira.
2. Rejects an issue outside `EBBACKLOG` or without an exact eligible label (`422`).
3. Returns a conflict without writing if Translation keys is initialized (`409`).
4. Writes the canonical ADF template if it is still empty.
5. Re-reads the Copy fields and returns Jira's authoritative stored value.
6. Treats an unexpectedly empty post-write value as an upstream failure, never as success (`502`).

Do not add an application lock: it would serialize DevMan requests but cannot include Jira UI or other external writers, so it would not establish the promised safety property. The immediate pre-write re-read narrows but does not eliminate Jira's time-of-check/time-of-use race; the implementation and UI must not describe this as fully atomic.

### Typed outcomes

```ts
type InitializeTranslationKeysResponse =
  | { outcome: "initialized"; copy: IssueCopyData }
  | { outcome: "already-initialized"; copy: IssueCopyData };
```

| Status | Meaning |
|---|---|
| `200` | `outcome: "initialized"`; Jira stored a non-empty value; `copy` is from the post-write re-read. |
| `409` | `outcome: "already-initialized"`; the final pre-write read found content; no write occurred; `copy` holds the authoritative current value. |
| `404` | The Jira issue does not exist. |
| `422` | The issue exists but is outside `EBBACKLOG` or lacks both eligible labels. |
| `500` / `502` | Unexpected DevMan or Jira failure, including a write followed by an unexpectedly empty read. |

While the request is pending the client disables the action. A `200` or typed `409` replaces local Copy data with the response's authoritative `copy`; other failures leave the action available and show the inline error below.

## Presentation

Use the **field-sections** layout (prototype A; alternatives preserved at [prototypes/CopyTabPrototype.tsx](prototypes/CopyTabPrototype.tsx)).

### Tab and layout

- Insert `Copy` into the modal's tab row only for a server-confirmed eligible issue. Place it after `Wayfinder` when present, otherwise after the preceding conditional tab, and before `Comments`.
- Do not select Copy automatically; preserve the modal's initial-tab behavior.
- One vertically stacked column with the modal's existing `px-6 py-4` content padding and `space-y-6` section rhythm.
- Section 1: `Copy & Translations`, helper text `Current Jira workflow status`, the value as a compact status badge. Render `Not set` in muted text when null.
- Section 2: `Translation keys`, helper text `Read-only content from Jira`, then either the ADF content or the empty-state action.

### Initialized rendering

- Render Translation keys as read-only ADF, preserving supported Jira structure rather than extracting only table-cell text.
- Render a table inside a horizontally scrollable, rounded, bordered container so narrow modal widths don't squeeze columns.
- Light-gray header row, visible cell borders, top-aligned cell content, the modal's normal small body text. Do not infer styling from column position; Jira ADF marks determine bold, emphasis, and links.
- Blank cells stay visibly blank. Never substitute `Not set` inside cells or treat an all-blank existing table as empty.

### Empty and saving states

- Centered dashed-border empty panel headed `No translation keys yet`.
- Explanation: `Start with the standard Key, Copy, and Comment table. Existing Jira content will never be replaced by this action.`
- Primary action label: `Create translation table`.
- While saving: keep the panel, disable the action, show a small spinner, change the label to `Creating table…`. Do not show a blank table optimistically.

### Conflict and errors

- A typed `already-initialized` conflict replaces local Copy data with the authoritative response and renders that ADF immediately.
- Above the refreshed content, an amber inline notice headed `Translation keys changed in Jira`, explaining `The latest Jira content is shown below. Nothing was overwritten.` This notice belongs to this completed action, not to a generic error state.
- Any non-conflict initialization failure keeps the empty panel and enabled action, and shows an inline red message beneath: `Couldn’t create the table. Jira did not save the change. Try again.`
- For either outcome: no toast as the only feedback, no closing the modal, no switching tabs, no discarding the displayed Copy status.

## Code seams (decided)

These are the calls made in answer to the finalize ticket; they are settled, not options.

1. **Server route + service — extend `missions.ts`.** Add `copy: IssueCopyData` to `StoryDetailResponse` (interface at `services/missions.ts:87–99`; populate the object literal at `:486–498`). Add `"customfield_11302"` and `"customfield_11285"` to the `fields` array at `:423`. Register `POST /api/missions/issues/:issueKey/copy/translation-keys/initialize` on `missionsRouter` in `routes/missions.ts` — the `/issues/` prefix is new on this router, so it does not collide with `/stories/:storyKey` (different prefix and method). Put the initialize service logic in `services/missions.ts`, reusing its private `getClient()`; do not create a third duplicated Jira client.

2. **Jira read/write.** Read via `jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch` (never the removed `searchForIssuesUsingJql`). Read `customfield_11302` as `{ value: string } | null` (precedent at `missions.ts:268`). Write `customfield_11285` via `jira.issues.editIssue({ issueIdOrKey, fields: { customfield_11285: <AdfDocument> }, notifyUsers: false })` (precedents at `missions.ts:410–414`, `launchpad.ts:68–75`).

3. **Client API — add a status-carrying error.** `fetchJson` and the existing mutating helpers collapse all failures into a generic `Error`, losing the status the UI needs to read the typed `409`. Add `class ApiError extends Error { constructor(message, public status: number, public body: unknown) }` in `api/client.ts`; on `!res.ok` throw `ApiError` with the parsed body. Add `api.missions.initializeTranslationKeys(issueKey): Promise<InitializeTranslationKeysResponse>`; the tab catches `ApiError`, reads `.status === 409` and `.body` for the conflict path.

4. **Status badge — add a `copyStatusBadge` helper.** `statusBadge` keys to `STATUS_COLORS` (Jira workflow statuses) and falls back to red; it does not consult `COPY_STATUS_COLORS`. Add `copyStatusBadge(status: string)` to `statusUtils.tsx` mirroring `statusBadge` but keyed to `COPY_STATUS_COLORS` with the gray fallback `bg-gray-100 text-gray-600` (matching `MilestoneGroup.tsx:108–112`).

5. **ADF renderer — add the missing table cases.** `renderAdfNode` in `StoryDetailModal.tsx` (`:56–110`) has no `table` / `tableRow` / `tableCell` / `tableHeader` cases; unknown nodes fall through to `default`, which would drop table structure. Add `table`, `tableRow`, `tableHeader`, and `tableCell` cases so Translation keys renders faithfully, wrapped per the presentation section.

6. **Tab wiring.** Extend the `activeTab` union (`StoryDetailModal.tsx:187`) with `"copy"`. Insert the Copy tab `<button>` between the Wayfinder block's close (`:343`) and Comments (`:344`), gated on a server-confirmed eligible issue. Copy data arrives inline in `StoryDetailResponse`, so the tab needs no lazy fetch of its own (unlike GitHub/Wayfinder); after a successful initialize it re-reads from the authoritative response `copy`. Render the tab content through a dedicated `CopyTab` component, following the `GitHubPrTab` / `WayfinderTab` precedent.

## Acceptance criteria

1. The Copy tab appears only for issues that are in `EBBACKLOG` and carry the exact label `copy` or `copy-clinical`, regardless of issue type; the server enforces this independently of the client.
2. The tab shows Copy & Translations read-only, as a compact badge, with `Not set` when the field is null.
3. Translation keys renders read-only from Jira ADF, preserving table structure in a horizontally scrollable container; blank cells stay blank and an all-blank existing table still counts as initialized.
4. When Translation keys is empty (missing, null, or structurally contentless), the empty panel shows with the `Create translation table` action.
5. While initializing, the action is disabled with a spinner and the `Creating table…` label; no optimistic blank table.
6. On success the rendered table is Jira's authoritative post-write value.
7. On a typed `already-initialized` conflict the local Copy data is replaced with the authoritative response and the amber `Translation keys changed in Jira` notice shows; nothing is overwritten.
8. On any other failure the empty panel and enabled action stay in place and the red inline error shows.
9. Neither success nor conflict closes the modal, switches tabs, uses a toast as the only feedback, or discards the Copy status.
10. The contract and UI never claim the initialization is fully atomic; the residual Jira TOCTOU race is documented.

## Test coverage

Per the finalize decision: automated coverage is **client unit tests**; the server endpoint is verified manually (ocular testing). No `jira.js` mock harness is introduced.

- **New `packages/client/src/components/StoryDetailModal.test.tsx`** (or a sibling `CopyTab.test.tsx`), following the established pattern of spying on the api singleton (`vi.spyOn(api.missions, "getStoryDetail")`, `vi.spyOn(api.missions, "initializeTranslationKeys")`, per `MissionPage.test.tsx:686` and `MilestoneWorkspace.test.tsx:257`). Cover:
  - the Copy tab is absent for a non-eligible issue and present for an eligible one;
  - Copy & Translations shows the badge value, and `Not set` when null;
  - initialized Translation keys renders the table;
  - empty state renders the `Create translation table` action;
  - saving disables the action and shows `Creating table…`;
  - success replaces the empty state with the returned table;
  - a thrown `ApiError` with `status: 409` shows the conflict notice and the refreshed content;
  - a non-conflict failure shows the red inline error and keeps the action enabled.
- Extend `statusUtils.test.ts` for `copyStatusBadge` (known value, gray-fallback unknown value).
- A `StoryDetailResponse` fixture does not exist; build detail objects inline as current tests do.

## Out of scope

- Editing an existing Translation keys value in DevMan.
- Changing Copy & Translations from DevMan.
- Applying this behavior to projects other than EBBACKLOG.
- Implementing the feature (this is a planning artifact).
