# Mission Focus Mode Acceptance

Date: 2026-09-09

## Automated Verification

- `pnpm --filter @devman/client test`: passed, 12 files and 110 tests.
- `pnpm --filter @devman/server test`: passed, 1 file and 12 tests.
- `pnpm build`: passed for the client and server packages.
- React lifecycle coverage runs `MissionPage` under Strict Mode and verifies that the media-query and keyboard listeners are cleaned up rather than accumulated.
- Production-seam coverage verifies Focus controls and chrome, route and Mission lifetime, responsive exits, shortcut and modal precedence, focus transitions, shared milestone projection and filtering, per-view collapse state, descriptions, Story Map destinations and drag signaling, and optimistic move success, rollback, refresh failure, and Mission reset outcomes.

The acceptance audit found and fixed one projection defect: Jira's literal `None` milestone value was rendered as an unknown row. It is now combined with `null` stories in the canonical **No milestone** row, whose persisted drop value remains `null`.

## Chromium Manual Pass

Not completed in this environment. No Chromium/browser-control tooling or project credentials/data are configured in the dedicated worktree, so the required real-browser pointer geometry, responsive rendering, sticky/fixed positioning, modal stacking, visual scaling, and accessibility smoke checks could not be truthfully verified. No browser automation was added.

The outstanding manual matrix remains the one specified in ticket 13: widths 1023px, 1024px, and wider desktop; normal and Focus List/Story Map presentation; horizontal overflow; real pointer drag/drop across ordinary, synthesized, described-empty, collapsed, unknown, **No milestone**, and **Out of scope** rows; pending/cancel/source-row behavior; drag-time `Z`; card click versus drag; visible focus and tab order; deliberate and responsive focus transitions; and Escape from an editor.
