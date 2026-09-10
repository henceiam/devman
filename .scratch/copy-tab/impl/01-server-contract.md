# Impl T1 — Server: Copy read contract + initialize endpoint

Type: implementation
Status: completed
Blocked by:

## Scope

Server-side half of `.scratch/copy-tab/spec.md`. All work in `packages/server/`.

Authoritative context (read these; do not redesign):
- Spec: `.scratch/copy-tab/spec.md` — sections "Contract", "Code seams" 1–2, acceptance criteria 1.
- Codebase facts: `.scratch/copy-tab/exploration/codebase-context.md` §1 and §6 items 1–2.
- Canonical ADF template (reproduce EXACTLY, including all `localId` values): `.scratch/copy-tab/research/reference-table-and-field-schema.md` lines 27–226.

## Work

1. `packages/server/src/services/missions.ts`:
   - Add types `AdfNode`, `AdfDocument`, `IssueCopyData`, `InitializeTranslationKeysResponse` near `StoryDetailResponse` (interface at lines 87–99), exactly as specced (spec.md lines 32–52, 81–84).
   - Add `copy: IssueCopyData;` to `StoryDetailResponse`.
   - Add `"customfield_11302"` and `"customfield_11285"` to the `fields` array in `getStoryDetail` (line 423).
   - Populate `copy:` in the return literal (lines 486–498). `status` = `(fields.customfield_11302 as { value: string } | null)?.value ?? null`. `translationKeys` = the ADF document when it passes minimal validation (root `type: "doc"`, `version: 1`, array `content`), else `null` (missing, null, structurally contentless, or malformed). `translationKeysState`: `"empty"` when missing/null/structurally contentless; `"initialized"` when there is real content — an existing table counts as initialized even if all cells are blank. "Structurally contentless" = valid doc whose `content` array is empty, or contains only nodes with no text and no meaningful structure (e.g. only empty paragraphs). A `table` node is always meaningful content.
   - Add `initializeTranslationKeys(issueKey): Promise<...>` service function reusing the module-local `getClient()`:
     a. Read via `jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch` with `jql: \`key = "${issueKey}"\``, fields `["labels", "project", "customfield_11302", "customfield_11285"]`.
     b. No issue found → throw a typed not-found error (route maps to 404). Follow the existing throw pattern but make the outcome distinguishable (e.g. a small error class or a code property) so the route isn't string-matching messages.
     c. Project key !== `EBBACKLOG` or labels lack both exact case-sensitive `copy` and `copy-clinical` → typed ineligible error (→ 422).
     d. Compute `translationKeysState`; if `"initialized"` → return typed `already-initialized` outcome with current copy data (no write).
     e. Write the canonical template via `jira.issues.editIssue({ issueIdOrKey: issueKey, fields: { customfield_11285: <template> }, notifyUsers: false })`.
     f. Re-read the copy fields the same way; if the post-write value is still empty → typed upstream failure (→ 502). Otherwise return `initialized` outcome with the re-read copy.
   - Do NOT add any application-level lock. Do NOT claim atomicity anywhere in code comments/UI strings.

2. `packages/server/src/routes/missions.ts`:
   - Register `POST /issues/:issueKey/copy/translation-keys/initialize` on `missionsRouter` (after the existing routes, end of file). Map outcomes: initialized → 200 `{ outcome: "initialized", copy }`; already-initialized → 409 `{ outcome: "already-initialized", copy }`; not-found → 404 `{ error }`; ineligible → 422 `{ error }`; upstream/unexpected → 502 or 500 `{ error }`. Keep the established try/catch handler shape.

## Verification

- `pnpm --filter @devman/server test` passes (existing tests).
- `pnpm build` typechecks (run from the worktree root; server `tsc` must be clean).
- Server endpoint behavior is verified manually (spec: ocular testing) — do not add a jira.js mock harness.

## Completion

Commit: `e236f7d4f33ef2f7632e07e1cbb5d23416b3eab8` (branch `agent/copy-tab-t1`, not pushed).

Files changed:
- `packages/server/src/services/missions.ts` (+330): new types near `StoryDetailResponse`; `copy: IssueCopyData` added to `StoryDetailResponse`; `"customfield_11302"`/`"customfield_11285"` added to the `getStoryDetail` fields array; `copy:` populated in the return literal via new private helpers; new `initializeTranslationKeys` service function; new exported error classes; canonical template constant.
- `packages/server/src/routes/missions.ts` (+20): `POST /issues/:issueKey/copy/translation-keys/initialize` registered at end of file, mapping outcomes to 200/409/404/422/502/500.

Exact type signatures added (in `packages/server/src/services/missions.ts`):

```ts
export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  [key: string]: unknown;
}

export interface AdfDocument extends AdfNode {
  type: "doc";
  version: 1;
  content: AdfNode[];
}

export interface IssueCopyData {
  status: string | null;
  translationKeys: AdfDocument | null;
  translationKeysState: "empty" | "initialized";
}

export type InitializeTranslationKeysResponse =
  | { outcome: "initialized"; copy: IssueCopyData }
  | { outcome: "already-initialized"; copy: IssueCopyData };

export class IssueNotFoundError extends Error { readonly code = "NOT_FOUND" as const; ... }
export class CopyIneligibleError extends Error { readonly code = "INELIGIBLE" as const; ... }
export class TranslationKeysUpstreamError extends Error { readonly code = "UPSTREAM" as const; ... }

export async function initializeTranslationKeys(
  issueKey: string,
): Promise<InitializeTranslationKeysResponse>
```

`StoryDetailResponse` gained `copy: IssueCopyData;` as its last field.

Notes / deviations:
- Typed outcomes use small exported Error subclasses with a `code` property (route distinguishes via `instanceof`, not string matching), per the ticket's suggested approach. The 404 mapping applies only to the new route; existing story-detail not-found behavior (500) is unchanged.
- `translationKeys` returns `null` whenever the state is `"empty"` (missing/null/structurally contentless/malformed all collapse to `null`), per the spec text; the validity check plus a "meaningful content" walk (any non-empty `text`, or any `table` node — a table counts even with all-blank cells) implements the "structurally contentless" rule. Malformed ADF (fails the doc/version/content invariants) also yields `null`.
- The canonical ADF template was verified byte-for-byte (post JSON-serialization) against `research/reference-table-and-field-schema.md` lines 27–226, including every `localId`.
- `maxResults: 1` added to the initialize read (same as the existing single-key reads at getStoryDetail).

Verification:
- `pnpm --filter @devman/server test` — 12/12 pass.
- `pnpm build` (worktree root) — server `tsc` and client `tsc -b && vite build` both clean.
- Manual endpoint verification against live Jira was not performed in this worktree (no running server/Jira credentials exercise here); per the ticket this is the ocular-testing step left to the integrator.
