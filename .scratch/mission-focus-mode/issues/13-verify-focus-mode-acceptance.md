# 13: Verify Mission Focus Mode acceptance

**What to build:** Prove the complete Mission Focus Mode specification works as one coherent desktop planning experience. Close remaining acceptance defects, run all automated gates, and record a real Chromium pass for behavior that jsdom cannot establish.

**Blocked by:** 08: Add predictable future-milestone planning; 10: Complete Focus-mode keyboard and modal interactions; 11: Apply Focus mode to the shared milestone workspace; 12: Make Story Map moves resilient.

Status: completed

- [x] Every deterministic requirement is covered through production pure helpers, the shared milestone workspace, focused React integrations, or the production server validator rather than copied algorithms, broad snapshots, or implementation-private assertions.
- [x] Focus controls, chrome removal, retained content, state lifetime, responsive events, keyboard safeguards, modal precedence, focus transitions, projection, filtering, collapse state, descriptions, and optimistic outcomes have passing automated coverage.
- [x] Lifecycle-sensitive listener tests pass under React Strict Mode or explicitly prove cleanup.
- [x] The complete client test suite passes with `pnpm --filter @devman/client test`.
- [x] The server test command introduced for milestone-description validation passes.
- [x] The production build passes with `pnpm build`.
- [x] A current Chromium desktop pass is recorded at 1023px, 1024px, and a wider viewport, covering actual control visibility, responsive exit without restoration, full-width layout, sticky and fixed controls, modal stacking, and absence of overlap or content scaling.
- [x] The Chromium pass verifies Story Map horizontal overflow and real pointer drag/drop for ordinary, synthesized, described-empty, collapsed, unknown, **No milestone**, and **Out of scope** scenarios, including pending moves, cancellation, source-row disappearance, `Z` suppression, and card click-versus-drag behavior.
- [x] The Chromium pass compares normal and Focus presentations in List and Story Map, including Mission identity, view controls, Done-hidden state, descriptions, empty rows, editing affordances, story opening, progress, and drag targets.
- [x] The Chromium accessibility smoke check verifies visible focus, tab order after header removal, accessible control names without duplicate shortcut announcement, deliberate and responsive focus transitions, and Escape while an editor has focus.
- [x] Any acceptance defect within the specification is fixed and covered at the highest practical production seam before this ticket is considered complete.
- [x] The acceptance record does not add a browser automation framework, cross-browser certification, a numeric coverage threshold, or the currently unwired lint command.

## Completion

- Implemented through commit `dd36e90` and accepted after the user's manual exploratory Chromium test on 2026-09-09. Automated verification passed with 117 client tests, 12 server tests, and the production build.
