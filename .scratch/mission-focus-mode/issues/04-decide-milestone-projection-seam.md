# Decide the milestone projection seam

Type: grilling
Status: resolved
Blocked by:

## Question

What single derived milestone model should feed both List and Story Map so used milestones, the next two numbered milestones, described empty milestones, Done filtering, Focus-mode empty-row removal, ordering, summaries, and Story Map drop targets cannot drift between views?

## Answer

Use an exported pure milestone projector behind a stable milestone workspace beneath `MissionPage`. The workspace owns the inputs and UI state that must survive Focus-mode and List/Story Map transitions; both views consume the same projected rows rather than grouping stories independently.

### Projection contract

Each row exposes:

- A stable identity based on its canonical Jira milestone value.
- A kind: `unassigned`, `numbered`, `unknown`, or `out-of-scope`.
- Its display name and optional milestone number.
- Its description.
- `allStories`: every non-rejected story assigned to the row.
- `visibleStories`: stories remaining after the current card filters.
- Complete status counts derived from `allStories`.
- Flags for whether it is synthesized, description-editable, and eligible as a drop destination.

The pure projector receives raw stories, card-filter state, and the existing description record. It does not receive Focus mode. The workspace applies Focus-mode row visibility after projection, keeping the milestone model independent of presentation mode.

Story Map derives category columns and cells from each shared row's visible stories. Category layout remains Story Map presentation logic rather than expanding the shared milestone projection into a complete grid.

### Row vocabulary and ordering

- Recognize only exact Jira values `Milestone 1` through `Milestone 10` as numbered milestones. Variants such as `milestone 3`, `Milestone 03`, and `Milestone 11` are unknown values and are not normalized.
- Treat Jira's `None` value as an `unassigned` row displayed as **No milestone**. It is not a numbered milestone.
- Preserve unexpected stored values as `unknown` rows so malformed data remains visible.
- Order rows as **No milestone**, numbered milestones ascending, unknown values lexicographically by stored value, then **Out of scope**.

### Row inclusion

Normal mode includes:

- Every used numbered milestone, where usage means assignment to at least one non-rejected story, including a Done story hidden by the card filter.
- Up to two numbered milestones immediately after the highest used numbered milestone, capped at Milestone 10.
- Milestones 1 and 2 when no numbered milestone is used.
- Every numbered milestone with a saved non-empty description.
- **No milestone**, **Out of scope**, and unknown rows only when they contain at least one non-rejected story.

Do not fill earlier numeric gaps. Described milestones do not advance the future-milestone window: synthesis is based only on the highest used numbered milestone.

Focus mode removes every row with zero visible stories after projection. Consequently, synthesized and described-empty rows are available for planning in normal mode but absent in Focus mode. If an optimistic drag moves the last visible story out of a Focus-mode row, that source row disappears immediately.

### Descriptions and progress

- Only numbered milestones can have descriptions. Only exact numbered-milestone description keys can create otherwise empty rows.
- Enforce this invariant at the server API boundary by rejecting description updates for any other value. Existing invalid stored keys are ignored; persisted-data cleanup is outside this effort.
- Use the term **milestone description** in the UI and projected model. Existing API and storage names may remain unchanged and are adapted at the projection boundary.
- Derive progress and status summaries from `allStories`, so hiding Done cards does not rewrite milestone progress.
- A zero-story List row omits progress rather than displaying `0 / 0`; opening it displays **No stories yet**.
- In normal mode, a used milestone whose stories are all hidden remains visible with complete progress and opens to **No stories yet**.

### Workspace state and interactions

- Keep separate collapse state for List and Story Map, keyed by row identity. Switching views restores that view's choices rather than sharing collapse actions between presentations.
- Preserve each view's collapse state across Focus-mode transitions and temporary row disappearance. Reset both when the selected Mission changes.
- List rows initially start collapsed. Story Map rows initially start expanded except **Out of scope**.
- Expanded Story Map rows expose category-cell drop targets. Collapsed rows are not drop targets and do not auto-expand during dragging.
- Numbered rows, **No milestone**, and **Out of scope** accept drops. Unknown rows permit moving stories out but are not drop destinations.
- Empty synthesized and described-numbered rows are drop targets in normal Story Map. They cannot be targeted in Focus mode because Focus mode omits empty rows.

The workspace also owns optimistic story changes so Story Map cannot maintain a competing projection. Apply a move immediately, recompute the shared projection, persist it, and disable further dragging for that story while its update is pending. Roll back and surface an error if persistence fails. On success, refresh Mission data and let the server response replace optimistic state. If that refresh fails, retain the successful optimistic result, show a non-blocking refresh error, and reconcile on a later refresh. Reset optimistic state when the selected Mission changes.
