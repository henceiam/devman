# Decide the Copy tab presentation

Type: prototype
Status: resolved
Blocked by: 01

## Question

What exact Copy-tab layout, table rendering, empty state, loading state, conflict state, and general error state should fit the existing Story detail modal while meeting the agreed behavior?

## Answer

Use prototype A, **Field sections**, because it follows the Story detail modal's existing compact hierarchy instead of introducing a competing sidebar or a misleading pre-initialization table preview. The reviewed prototype source, including alternatives B and C, is preserved at [`../prototypes/CopyTabPrototype.tsx`](../prototypes/CopyTabPrototype.tsx).

### Tab and layout

- Insert `Copy` into the existing tab row only for a server-confirmed eligible issue. Place it after `Wayfinder` when Wayfinder is present, otherwise after the preceding conditional tab, and before `Comments`.
- Do not select Copy automatically. Preserve the modal's existing initial-tab behavior.
- Use one vertically stacked content column with the modal's existing `px-6 py-4` content padding and `space-y-6` section rhythm.
- The first section is `Copy & Translations`, followed by the helper text `Current Jira workflow status` and the field value as a compact status badge. Render `Not set` in muted text when the value is null.
- The second section is `Translation keys`, followed by the helper text `Read-only content from Jira`, then either the ADF content or the empty-state action.

### Initialized rendering

- Render Translation keys as read-only ADF, preserving supported Jira structure rather than extracting only table cell text.
- Render a table within a horizontally scrollable, rounded, bordered container so narrow modal widths do not squeeze or truncate columns.
- Use a light-gray header row, visible cell borders, top-aligned cell content, and the modal's normal small body text. Do not infer semantic styling from column position; marks in Jira ADF determine bold, emphasis, links, and other text presentation.
- Blank cells remain visibly blank. Do not substitute `Not set` inside cells or treat an all-blank existing table as empty.

### Empty and saving states

- Show a centered dashed-border empty panel headed `No translation keys yet`.
- Explain the action with: `Start with the standard Key, Copy, and Comment table. Existing Jira content will never be replaced by this action.`
- Label the primary action `Create translation table`.
- While saving, keep the panel in place, disable the action, show a small spinner, and change its label to `Creating table…`. Do not show a blank table optimistically.

### Conflict and errors

- A typed `already-initialized` conflict replaces local Copy data with the authoritative response and renders that ADF immediately.
- Above the refreshed content, show an amber inline notice headed `Translation keys changed in Jira` with the explanation `The latest Jira content is shown below. Nothing was overwritten.` The notice belongs to this completed action, not to a generic error state.
- For any non-conflict initialization failure, keep the empty panel and enabled action in place. Show an inline red message beneath it: `Couldn’t create the table. Jira did not save the change. Try again.`
- Do not use a toast as the only feedback, close the modal, switch tabs, or discard the displayed Copy status for either outcome.
