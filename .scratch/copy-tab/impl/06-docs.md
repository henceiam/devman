# Impl T6 — Docs: residual TOCTOU race + domain field updates

Type: implementation
Status: completed
Blocked by: 01

## Scope

Documentation only. Implements spec acceptance criterion 10 and keeps CLAUDE.md/domain docs accurate per repo policy ("If you modified anything mentioned in AGENTS.md/CLAUDE.md, update it").

## Work

1. `.github/instructions/domain-logic.instructions.md`: the custom-field table already gained a `customfield_11285` row in a previous commit — verify it matches what T1 implemented (read-only in DevMan when populated; Copy-eligible issues can initialize an empty value from the canonical template; initialization is best-effort, NOT atomic — Jira has no compare-and-set for this field; a residual time-of-check/time-of-use race remains). Update wording if the implementation differs.
2. `CLAUDE.md`: under "Domain knowledge (Jira custom fields)", add `customfield_11285` = Translation keys (ADF textarea) to the field-ID list if not already implied, one line only.
3. Nothing else — no README, no new docs.

## Verification

- Docs build/lint is N/A; just accurate content.

## Completion

Commit: `3c29873` — docs: document customfield_11285 init guard + residual TOCTOU race

- Verified T1 implementation in `packages/server/src/services/missions.ts`: `customfield_11285` rendered read-only when populated (`buildIssueCopyData`), `initializeTranslationKeys` guarded by EBBACKLOG project + `copy`/`copy-clinical` label check with an "already-initialized" short-circuit, and best-effort (read → empty-check → `editIssue` write → re-read) — Jira has no compare-and-set, so a residual TOCTOU race remains.
- `.github/instructions/domain-logic.instructions.md`: row for `customfield_11285` updated to flag initialization as best-effort; new "Translation keys initialization" note in Scope & Behavior Notes documenting the non-atomic, residual TOCTOU race.
- `CLAUDE.md`: added `customfield_11285` = Translation keys (ADF textarea) to the field-ID list (one line, in place).
- `pnpm build` passes (server tsc + client tsc -b && vite build).
