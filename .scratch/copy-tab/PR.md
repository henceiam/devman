# PR: Copy tab for issue details

**Branch:** `feat/copy-tab` (worktree: `/Users/henricjohansson/DevMan.worktrees/copy-tab`)
**Base:** `main` (d7037f7)
**State:** DRAFT

> This repo has no git remote; this file is the pull-request record. The branch is the reviewable artifact.

## Summary

Implements the Copy tab spec: `.scratch/copy-tab/spec.md`.

Adds a **Copy** tab to the story/issue detail modal for Copy-eligible EBBACKLOG issues (exact label `copy` or `copy-clinical`, any issue type). Shows Copy & Translations (`customfield_11302`) read-only and Translation keys (`customfield_11285`, ADF) read-only, with a guarded one-click initialization of the canonical Key/Copy/Comment table when empty. Server independently enforces eligibility; initialization is best-effort (Jira has no compare-and-set — residual TOCTOU race is documented, never claimed atomic).

Closes:
- `.scratch/copy-tab/issues/01-establish-reference-table-and-field-schema.md`
- `.scratch/copy-tab/issues/02-decide-safe-jira-read-write-contract.md`
- `.scratch/copy-tab/issues/03-decide-copy-tab-presentation.md`
- `.scratch/copy-tab/issues/04-finalize-implementation-ready-specification.md`
- Spec: `.scratch/copy-tab/spec.md`

## Implementation tickets (task graph)

| # | Ticket | Blocked by | Status |
|---|--------|-----------|--------|
| T1 | `impl/01-server-contract.md` — server read contract + initialize endpoint | — | merged |
| T2 | `impl/02-client-api.md` — ApiError + client types + endpoint wrapper | — | merged |
| T3 | `impl/03-adf-table-rendering.md` — table cases in renderAdfNode + tests | — | merged |
| T4 | `impl/04-copy-status-badge.md` — copyStatusBadge + tests | — | merged |
| T5 | `impl/05-copy-tab-component.md` — CopyTab + modal wiring + tests | T1, T2, T3, T4 | merged |
| T6 | `impl/06-docs.md` — TOCTOU + domain docs | T1 | merged |

## Verification

- Client: `pnpm --filter @devman/client test`
- Server: `pnpm --filter @devman/server test`
- Build: `pnpm build`
- Server endpoint verified manually per spec (no jira.js mock harness).
