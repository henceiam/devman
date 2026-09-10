# 12: Make Story Map moves resilient

**What to build:** Make Story Map milestone moves responsive and trustworthy across Focus mode, persistence failures, refresh failures, cancellation, and Mission changes. Users see immediate valid results, cannot race an in-flight move, and receive visible feedback without losing a move that Jira already accepted.

**Blocked by:** 07: Unify Mission milestone presentation behind the shared workspace; 10: Complete Focus-mode keyboard and modal interactions; 11: Apply Focus mode to the shared milestone workspace.

Status: completed

- [x] Starting a valid move applies the canonical destination immediately through shared optimistic state and recomputes both views' milestone projection.
- [x] A story with a pending update cannot begin another move until its current persistence cycle finishes.
- [x] Drag end and drag cancellation both clear active-drag state so Focus shortcuts resume at the correct time.
- [x] Persistence failure restores the prior milestone projection and presents a visible error to the user.
- [x] Persistence success refreshes Mission data and lets the server response replace optimistic state.
- [x] If refresh fails after persistence succeeds, the successful optimistic result remains visible and a non-blocking refresh error is shown for later reconciliation.
- [x] Changing the selected Mission resets pending and optimistic move state so it cannot leak across Missions.
- [x] Collapsed rows remain unavailable as drop targets and do not auto-expand; unknown rows cannot receive drops.
- [x] Focus-mode source-row disappearance and normal-mode empty future destinations continue to follow the shared projection rules during moves.
- [x] Pure workspace or state-transition tests cover immediate updates, pending locks, rollback, success and refresh outcomes, cancellation, and Mission reset without relying on jsdom drag geometry.
- [x] Integration tests verify active-drag signaling and user-visible errors.
- [x] Existing client and server tests and the production build pass.

## Completion

Implemented in commit `e791d70`.
