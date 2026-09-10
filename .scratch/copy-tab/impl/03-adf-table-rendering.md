# Impl T3 — ADF table rendering in renderAdfNode

Type: implementation
Status: ready-for-agent
Blocked by:

## Scope

`packages/client/src/components/StoryDetailModal.tsx` `renderAdfNode` (lines 39–111) plus unit tests. Implements spec seam 5.

Authoritative context:
- Spec: `.scratch/copy-tab/spec.md` — "Initialized rendering", seam 5.
- Codebase facts: `.scratch/copy-tab/exploration/codebase-context.md` §2c (full current `renderAdfNode` code, and the invalid-`<span>`-inside-`<table>` caveat) and §3 (test patterns).
- Prototype table chrome: `.scratch/copy-tab/prototypes/CopyTabPrototype.tsx` lines 30–50 — BUT note the spec rejects column-position styling (no `font-mono` on column 0); only ADF marks determine bold/em/links.

## Work

1. Add `table`, `tableRow`, `tableHeader`, and `tableCell` cases to `renderAdfNode`:
   - Do NOT reuse the shared `renderedChildren` helper for table structure (it wraps children in `<span key>`, invalid inside `<table>`/`<tr>`). Map children directly to real `<tr>`/`<td>`/`<th>` elements.
   - `table` → wrap in `<div className="overflow-x-auto rounded-lg border border-gray-200">` containing `<table className="w-full table-fixed border-collapse text-left text-sm">`. Header rows go in `<thead className="bg-gray-50 text-xs font-semibold text-gray-600">` when the row's cells are `tableHeader` nodes; body rows in `<tbody className="text-gray-700">`. (Simplest faithful approach: partition rows by whether all cells are `tableHeader`.)
   - `tableHeader` → `<th className="border-b border-r border-gray-200 px-3 py-2 last:border-r-0 align-top">`, `tableCell` → `<td>` with the same border/padding/align-top treatment (plus `border-b` on non-last rows if simplest at the row level — match the prototype's look).
   - Blank cells stay visibly blank (prototype uses `<span className="text-gray-300">&nbsp;</span>` for empty paragraphs). Never substitute `Not set`.
   - Cell content continues through `renderAdfNode` so paragraphs/marks render normally.
2. Add unit tests for the new cases. Create `packages/client/src/components/StoryDetailModal.test.tsx` rendering `StoryDetailModal` directly with spies (`vi.spyOn(api.missions, "getStoryDetail")`, `vi.spyOn(api.missions, "getStoryComments")` — the modal fires BOTH on mount; a never-resolving promise is fine for the one you don't care about). Build `StoryDetailResponse` objects inline (see client.ts:191–203 for the shape; `copy` may be absent in these tests only if T2 has landed — if not, include a placeholder `copy` field cast as needed, or keep this file table-focused so T5 can extend it). Use `fireEvent` (no userEvent), jest-dom matchers via the existing setup. Cover: a table ADF in the description renders a real `<table>` with header cells `Key`/`Copy`/`Comment`, blank cells render blank, and marks (e.g. `strong`) still apply inside cells.

## Verification

- `pnpm --filter @devman/client exec vitest run src/components/StoryDetailModal.test.tsx` passes.
- `pnpm --filter @devman/client test` passes; `pnpm build` typechecks.

## Notes

Do NOT add the Copy tab button, `"copy"` to the activeTab union, or `CopyTab.tsx` here — that's T5. Keep the diff focused on ADF rendering + its tests. T5 will extend this new test file or add a sibling.

## Completion

Report the commit hash and the test file path.
