# 08: Add predictable future-milestone planning

**What to build:** Give Mission planners predictable empty future milestones and consistent milestone descriptions in normal mode. Both List and Story Map expose the same valid planning rows, empty numbered milestones can receive stories, malformed Jira values remain visible without becoming valid destinations, and the server prevents unsupported description keys.

**Blocked by:** 07: Unify Mission milestone presentation behind the shared workspace.

Status: completed

- [x] Only exact Jira values `Milestone 1` through `Milestone 10` are classified as numbered milestones; all other unexpected stored values remain visible as unknown rows without normalization.
- [x] Rows are ordered as **No milestone**, numbered milestones ascending, unknown values lexicographically by stored value, then **Out of scope**.
- [x] Normal mode includes every used milestone, where Done stories with hidden cards still make their numbered milestone used.
- [x] With no used numbered milestone, Milestones 1 and 2 are synthesized; otherwise at most the next two milestones after the highest used milestone are synthesized, capped at Milestone 10, without filling earlier gaps.
- [x] Numbered milestones with saved non-empty descriptions appear even when empty, and descriptions do not advance the synthesis window.
- [x] **No milestone**, **Out of scope**, and unknown rows appear only when they contain a non-rejected story and are never synthesized.
- [x] Expanded zero-story List rows display `No stories yet` and omit progress rather than displaying `0 / 0`.
- [x] Empty synthesized and described-numbered rows accept Story Map drops; numbered rows, **No milestone**, and **Out of scope** are valid destinations, while unknown rows only permit moving stories out.
- [x] User-facing and projected-model terminology uses **milestone description** while existing storage or API naming may be adapted internally.
- [x] The server API boundary accepts description updates only for exact `Milestone 1` through `Milestone 10` keys and rejects malformed, special, unknown, or out-of-range keys.
- [x] Minimal server-side Vitest support tests the production validator; client tests exhaustively cover projection, synthesis, ordering, descriptions, row flags, and empty states.
- [x] Client tests, server tests, and the production build pass.

## Completion

- Implemented by commit `25a02fe` (`feat: add future milestone planning`). Verified with `pnpm --filter @devman/client test` (56 tests passed), `pnpm --filter @devman/server test` (12 tests passed), `pnpm build`, and `git diff --check`.
