# 07: Unify Mission milestone presentation behind the shared workspace

**What to build:** Make List and Story Map consume one shared production milestone projection while preserving current user-visible behavior. The shared workspace owns per-view collapse choices and optimistic story state, eliminating competing grouping models and establishing the behavioral seam for future-milestone planning and Focus mode.

**Blocked by:** None (can start immediately).

Status: completed

- [x] An exported pure projector supplies typed milestone rows with stable identity, kind, display name, optional milestone number, description, `allStories`, `visibleStories`, complete status counts, synthesized state, description editability, and drop eligibility.
- [x] Rejected stories are excluded before projection, while the Done-card filter affects `visibleStories` without changing `allStories` or complete status counts.
- [x] List and Story Map render from the same projected rows rather than grouping stories independently.
- [x] Story Map continues deriving category columns and cells from each row's visible stories.
- [x] List and Story Map have separate collapse maps keyed by row identity, with List initially collapsed and Story Map initially expanded except **Out of scope**.
- [x] Collapse choices survive view switches and reset when the selected Mission changes.
- [x] Optimistic story data moves into the shared workspace without regressing existing Story Map moves.
- [x] Production-helper and workspace tests cover the shared projection, filtering, collapse ownership, and Mission-change reset without duplicating production logic.
- [x] Existing client tests and the production build pass.

## Completion

- Resolved by commit `5dceb02` (`refactor: unify mission milestone workspace`). Verified with `pnpm --filter @devman/client test` (48 tests passed) and `pnpm build` (client and server passed).
