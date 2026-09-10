# Decide implementation acceptance coverage

Type: grilling
Status: resolved
Blocked by: 02, 03, 04, 05

## Question

Which component and interaction scenarios must the implementation-ready specification require as automated tests and manual checks so Focus-mode chrome, state lifetime, keyboard safeguards, responsive exclusion, milestone projection, summary editing, filtering, collapse preservation, and drag targets are demonstrably correct?

## Answer

Require automated tests for every deterministic rule. Reserve manual checks for behavior that depends on real browser layout, pointer geometry, or assistive presentation. Tests must exercise production helpers and components rather than duplicate their logic, and should use focused seams instead of one oversized `MissionPage` test or Tailwind-class snapshots.

### Pure client tests

Test the exported milestone projector and Focus row filter directly:

- Rejected stories do not create rows or contribute counts.
- Done stories hidden from cards remain in `allStories` and complete status counts while being absent from `visibleStories`.
- Only exact values `Milestone 1` through `Milestone 10` are numbered. Case variants, zero-padded values, and out-of-range values remain unknown.
- **No milestone**, numbered, unknown, and **Out of scope** rows have the decided ordering and inclusion rules.
- With no used numbered milestone, Milestones 1 and 2 are synthesized. Otherwise, at most the next two milestones after the highest used milestone are synthesized, capped at Milestone 10, without filling earlier gaps.
- Described empty numbered milestones are included, but descriptions do not advance the synthesis window and invalid description keys do not create rows.
- Row identity, kind, description, synthesized state, description editability, and drop eligibility match the projection contract.
- Zero-story rows omit progress, and projection remains independent of Focus mode.
- Focus mode removes rows with no visible stories while retaining descriptions on rows that remain.

Test one shared Mission-shortcut guard directly for `Z`, `R`, and `D`:

- Valid lowercase and uppercase events work; `Shift+Z` is allowed.
- Ctrl, Cmd, and Alt modifiers, repeated events, prevented events, and unrelated keys are ignored.
- Events from `input`, `textarea`, `select`, `contenteditable`, or descendants of editable elements are ignored.
- All Mission shortcuts are suppressed while any Mission modal is open.
- `Z` is suppressed during an active Story Map drag and resumes after drag end or cancellation.
- Focus entry requires a desktop viewport and loaded Mission detail; Focus exit remains available during replacement-detail loading.

Test optimistic milestone moves at a pure workspace or state-transition boundary:

- A move updates projection immediately and locks further dragging for that story while persistence is pending.
- Persistence failure rolls back and exposes an error.
- Persistence success triggers refresh.
- Refresh failure retains the successful optimistic result and exposes a non-blocking error.
- Changing Mission resets optimistic state.

### Client component and integration tests

Using React Testing Library, mocked API methods, router support, and a controllable `matchMedia` shim, require tests that prove:

- The desktop entry control is hidden below 1024px, visible at desktop width, and disabled with an explanation until Mission detail is loaded.
- Enter and Exit controls are native buttons named `Enter Focus mode` and `Exit Focus mode`, expose `aria-keyshortcuts="Z"`, and do not duplicate the presentational key hint in their accessible names.
- Entering Focus mode removes the global DevMan header, Mission selector, Epic card, statistics, shortcut legend, and milestone-description edit controls from the DOM where applicable.
- Focus mode retains compact Mission identity, the view toggle, Done-hidden indicator, milestone descriptions, story opening, and focused content.
- Focus mode survives List/Story Map and Mission switches while `MissionPage` remains mounted, including replacement-detail loading, but resets after leaving and returning to the Missions route or remounting.
- A failed replacement load exits Focus mode only when no valid Mission detail remains.
- A controlled media-query change below 1024px exits Focus mode, and growing the viewport does not restore it.
- The route-agnostic application-chrome interface removes the header from layout, keyboard navigation, and the accessibility tree rather than only hiding it visually, without changing chrome on unrelated routes.
- Keyboard events obey the shared guard and modal/drag precedence rules. Escape closes the active Mission modal without changing Focus mode.
- Story detail, category editing, and milestone-description editing are mutually exclusive.
- Entry focuses the Focus command-bar Mission heading; deliberate exit returns focus to the entry control; responsive exit preserves a still-rendered target or moves focus to the normal Mission heading when the Focus target disappears.
- List and Story Map keep separate collapse maps with their decided initial states; both survive Focus transitions and temporary row disappearance, restore on view switches, and reset on Mission changes.
- Expanded empty List rows show `No stories yet` and omit progress.
- Milestone-description save trims text, supports the empty-string deletion contract, keeps errors visible without closing, refreshes descriptions after success, and supports the required Escape behavior.
- Drag start/end/cancellation updates the shared active-drag state used by shortcut suppression. Drop eligibility and optimistic outcomes are tested without pretending jsdom can validate dnd-kit geometry.

Run lifecycle-sensitive listener tests under React Strict Mode, or otherwise explicitly prove cleanup, so keyboard and media-query listeners cannot accumulate.

### Server tests

Add minimal server-side Vitest support and test the real production milestone-description key validator used by the API boundary. It must accept exact `Milestone 1` through `Milestone 10` values and reject zero, values above 10, zero-padded and case variants, **No milestone**, **Out of scope**, and unknown strings. Do not substitute a client-side copy or require route-level Jira mocks for this invariant.

### Manual browser matrix

Do not add a browser automation framework as part of this effort. Before acceptance, complete and record one pass in a current Chromium desktop browser using both mouse and keyboard:

- At 1023px, 1024px, and a wider desktop width, verify actual control visibility, immediate responsive exit, no automatic restoration, full-width command bar/work surface, and absence of overlap or unintended content scaling.
- Scroll List and Story Map to verify sticky command-bar behavior, fixed Exit-control availability, modal stacking, and unobstructed content.
- Use a Story Map with enough columns to verify horizontal scrolling and absence of unintended page clipping.
- Exercise real dnd-kit interactions: ordinary moves, empty synthesized and described-numbered targets in normal mode, unavailable empty targets in Focus mode, collapsed rows, unknown rows, **No milestone**, **Out of scope**, source-row disappearance, pending moves, cancellation, and `Z` suppression during a drag.
- Verify card click-versus-drag behavior with a real pointer.
- Compare List and Story Map in normal and Focus modes to verify retained identity, controls, indicators, descriptions, cards, and empty-row behavior, plus removal of the intended chrome and editing affordances.
- Verify visible focus, tab order after header removal, accessible control names without duplicate `Z` announcement, and Escape behavior while an editor has focus. A comprehensive modal accessibility audit remains out of scope.

### Acceptance gates

The implementation handoff must require:

- The complete client test suite, including all new feature tests: `pnpm --filter @devman/client test`.
- The new server test command introduced with minimal server Vitest support.
- A successful production build: `pnpm build`.
- The completed Chromium manual-check record.

Do not require the currently unwired lint command, a numeric coverage threshold, cross-browser certification, or a new real-browser automation framework for this effort.
