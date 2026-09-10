# Impl T5 — CopyTab component + modal wiring

Type: implementation
Status: completed
Blocked by: 01, 02, 03, 04

## Scope

New `packages/client/src/components/CopyTab.tsx`, tab wiring in `StoryDetailModal.tsx`, and the Copy-tab unit tests. Implements spec seams 6 + "Presentation" + "Test coverage".

Authoritative context:
- Spec: `.scratch/copy-tab/spec.md` — "Presentation", "Empty and saving states", "Conflict and errors", seam 6, acceptance criteria 1–10, "Test coverage".
- Codebase facts: `.scratch/copy-tab/exploration/codebase-context.md` §2c (tab row, activeTab union, lazy-fetch precedent, modal padding, reset effect), §2d (where CopyTab lives + suggested props), §3 (test patterns), §4 (eligibility gating — derive client-side from `detail.labels` + `detail.key.startsWith("EBBACKLOG-")`).
- Visual reference (decided variant A): `.scratch/copy-tab/prototypes/CopyTabPrototype.tsx` lines 30–50 (table chrome), 52–66 (empty action), 68–75 (conflict notice), 82–100 (field sections layout).

## Prerequisites from earlier tickets (verify in the merged tree before starting)

- `StoryDetailResponse.copy: IssueCopyData` (client type, T2).
- `api.missions.initializeTranslationKeys(issueKey)` + `ApiError` with `.status`/`.body` (T2).
- `copyStatusBadge(status)` in `statusUtils.tsx` (T4).
- `renderAdfNode` table cases + an exported way for CopyTab to render ADF (T3; if T3 didn't export the renderer, export `renderContent`/`renderAdfNode` from `StoryDetailModal.tsx` or extract to a small shared module — implementer's choice, minimal diff).

## Work

1. `CopyTab.tsx` (new, default export, in `packages/client/src/components/` following the `GitHubPrTab`/`WayfinderTab` precedent):
   - Props: `copy: IssueCopyData`, `issueKey: string`, `onCopyChange: (copy: IssueCopyData, meta?: { conflict?: boolean }) => void` (shape is implementer's choice, but the modal must be able to store authoritative copy and the conflict notice must live with the completed action).
   - Layout: `space-y-6` stacked sections (content padding comes from the modal). Section 1: `Copy & Translations`, helper `Current Jira workflow status`, value via `copyStatusBadge`, `Not set` in muted text when null. Section 2: `Translation keys`, helper `Read-only content from Jira`, then ADF content or the empty panel.
   - Initialized: render `copy.translationKeys` read-only through the ADF renderer (table cases come from T3). Blank cells blank; never `Not set` inside cells.
   - Empty: centered dashed-border panel, heading `No translation keys yet`, explanation `Start with the standard Key, Copy, and Comment table. Existing Jira content will never be replaced by this action.`, primary button `Create translation table`.
   - Saving: keep panel, disable button, small spinner, label `Creating table…`. No optimistic table.
   - On 200: call `onCopyChange` with the response `copy` (renders the authoritative table).
   - On `ApiError` with `status === 409`: call `onCopyChange` with `body.copy` and show the amber notice `Translation keys changed in Jira` / `The latest Jira content is shown below. Nothing was overwritten.` above the refreshed content. The notice belongs to this completed action (not a generic error state) — it should persist until the underlying copy data changes again or the modal re-opens; no toast, no tab switch, no modal close.
   - On any other failure: keep the empty panel + enabled action, show inline red message `Couldn’t create the table. Jira did not save the change. Try again.` beneath.
   - Never claim atomicity in UI copy.
2. `StoryDetailModal.tsx` wiring:
   - Extend the `activeTab` union (line 187) with `"copy"`.
   - Insert the Copy `<button>` between the Wayfinder block close (line 343) and Comments (line 344), same className template, gated on eligibility derived from `detail.labels` (exact `copy` or `copy-clinical`) AND `detail.key.startsWith("EBBACKLOG-")`.
   - Do not auto-select Copy; preserve the initial-tab behavior.
   - Add `{detail && activeTab === "copy" && <CopyTab … />}` content near lines 418–436, passing `detail.copy` and storing authoritative updates in modal state (reset any copy-conflict state in the storyKey-change effect at lines 198–222).
3. Tests — extend `StoryDetailModal.test.tsx` (from T3) or add `CopyTab.test.tsx` (spec allows either), following §3 patterns (spy on `api.missions.getStoryDetail`/`getStoryComments`/`initializeTranslationKeys`; `fireEvent`; inline detail fixtures; `deferred` helper for the pending state). Cover the spec's list (spec.md lines 162–172):
   - tab absent for non-eligible issue, present for eligible one;
   - badge value + `Not set` when null;
   - initialized renders the table;
   - empty state shows the action;
   - saving disables the action + shows `Creating table…`;
   - success replaces empty state with the returned table;
   - thrown `ApiError` status 409 → conflict notice + refreshed content;
   - non-conflict failure → red inline error, action stays enabled.

## Verification

- `pnpm --filter @devman/client test` passes; `pnpm build` typechecks.

## Completion

- Commit: `415f2e4` (`feat: add Copy tab to story detail modal with translation-key initialization`), branch `agent/copy-tab-t5`.
- Test file: `packages/client/src/components/StoryDetailModal.test.tsx` (extended; 13 Copy-tab tests added alongside T3's 4 ADF table tests — 17 total in the file, 136 across the client suite, all passing). `pnpm build` typechecks both packages.
- Coverage: tab absence (no label / non-exact label `copywriting` / non-EBBACKLOG key) and presence; badge value + gray fallback classes; `Not set` when status null; `copy-clinical` eligibility; initialized table render; empty-state action; pending state (`Creating table…`, disabled, no optimistic table); success replacing the panel with the authoritative table + refreshed status badge; thrown `ApiError(409)` → amber notice + refreshed content; non-conflict failure → red inline error + action stays enabled; Copy tab never auto-selected; notice positioned above refreshed content with no tab switch/modal close.
- Deviations:
  1. **Notice clearing implemented as React's render-time "adjusting state when a prop changes" pattern** (`conflictCopy !== copy` → reset) instead of `useEffect(() => setConflict(false), [copy])`. The effect version was verified via logging to fire *before* the queued `setConflict(true)` from the catch block was committed (both queued against the same pre-update render), wiping the notice every time — an ordering hazard. The documented render-time adjustment pattern is race-free.
  2. **`key={detail.key}` on `<CopyTab>`** so per-story conflict/saving state resets on story change (modal instance survives `storyKey` prop changes; a key is the idiomatic reset and keeps the modal's storyKey-change effect untouched).
  3. Test for the notice lifecycle asserts position-above-content + no tab switch/modal close rather than cross-tab persistence (remount-on-tab-switch follows the GitHub/Wayfinder tab pattern).
- No atomicity claims in UI copy; no toast; no tab switch; no modal close on either outcome.
