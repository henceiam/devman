# 11: Apply Focus mode to the shared milestone workspace

**What to build:** Make the shared milestone workspace present only active card content in Focus mode while preserving complete planning truth and users' view-specific workspace choices. Both List and Story Map behave consistently as filters, view changes, Focus transitions, and optimistic moves change row visibility.

**Blocked by:** 07: Unify Mission milestone presentation behind the shared workspace; 08: Add predictable future-milestone planning; 09: Introduce the responsive Focus-mode shell.

Status: completed

- [x] The pure milestone projector remains independent of Focus mode; the shared workspace filters projected rows for Focus presentation.
- [x] Focus mode removes every row with zero visible stories, including synthesized and described-empty rows and used rows containing only hidden Done cards.
- [x] Normal mode continues showing all rows required for planning, including used rows whose cards are all hidden, with progress and status counts derived from complete story membership.
- [x] Milestone descriptions remain visible on retained Focus rows while editing affordances remain unavailable.
- [x] List and Story Map expose identical Focus row membership from the shared workspace.
- [x] View-specific collapse maps survive Focus entry and exit, view switches, and temporary row disappearance; changing Mission resets both maps.
- [x] Story opening, the view toggle, Done-hidden indicator, and valid drag/drop interactions remain available in Focus mode.
- [x] Empty normal-mode rows remain valid planning destinations but cannot be targeted in Focus mode because they are not rendered.
- [x] An optimistic move that removes the last visible story from a Focus row causes that source row to disappear immediately without losing its stored collapse choice.
- [x] Pure and integration tests cover normal-versus-Focus row filtering, complete progress under Done filtering, description retention, collapse preservation, view parity, and source-row disappearance.
- [x] Existing client and server tests and the production build pass.

## Completion

- Implemented by commit `484fa74` (`feat: apply focus to milestone workspace`). Verified with focused workspace tests, the complete client and server test suites, `pnpm build`, and `git diff --check`.
