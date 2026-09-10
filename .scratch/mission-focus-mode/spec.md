# Mission Focus Mode

Status: completed

## Problem Statement

The Mission page makes it difficult to concentrate on planning work because its global and Mission-level chrome continues to occupy space while users work in either List or Story Map. Its existing fold behavior does not provide a predictable focused workspace, and milestone planning differs between the two views: empty future milestones are unavailable, hidden Done cards can accidentally affect grouping and progress, descriptions and collapse state are not modeled consistently, and Story Map owns competing grouping and optimistic-move behavior.

Users need a desktop Focus mode that removes nonessential chrome without scaling content or sacrificing Mission identity, view controls, filtering context, story access, milestone descriptions, or Story Map drag/drop. They also need predictable future-milestone planning in normal mode and safe milestone-description editing. The result must preserve state intentionally, handle keyboard, modal, responsive, and drag interactions deterministically, and expose one shared milestone model to both Mission views.

## Solution

Add a transient, desktop-only Focus mode to the Mission page. At viewport widths of 1024px and above, users can enter or exit with a dedicated control or the `Z` shortcut. Focus mode removes the global DevMan header, Mission selector, Epic card, statistics, shortcut legend, milestone-description editing controls, and milestone rows with no visible stories. It replaces that chrome with a sticky, full-width command bar containing compact Mission identity, the List/Story Map toggle, and the Done-hidden indicator, plus a fixed upper-right Exit Focus control.

Normal mode always displays the complete Mission chrome and a predictable planning projection: every used numbered milestone, up to two numbered milestones immediately after the highest used milestone, and any empty numbered milestone with a saved description. Both List and Story Map consume one shared, typed milestone projection that distinguishes complete story membership from currently visible cards. The shared workspace also owns collapse state and optimistic moves so view switches, Focus transitions, filtering, and drag/drop cannot cause the two presentations to drift.

Focus mode remains active across Mission and view switches while the Mission page stays mounted, but resets on reload or navigation away. It exits immediately if the viewport becomes narrower than 1024px and does not automatically return when the viewport grows. Keyboard shortcuts, modals, responsive transitions, focus movement, and active drags follow one explicit precedence contract.

## User Stories

1. As a Mission planner, I want to enter Focus mode from the Mission page, so that I can concentrate on planning content without unrelated chrome.
2. As a keyboard-oriented Mission planner, I want to toggle Focus mode with `Z`, so that I can change workspace modes without reaching for the pointer.
3. As a Mission planner, I want a visible Focus-mode control that displays the `Z` shortcut, so that the mode and its shortcut are discoverable.
4. As a Mission planner, I want Focus mode to be available only when a Mission has loaded, so that I never enter an empty or misleading workspace.
5. As a Mission planner waiting for data, I want the desktop entry control to explain why it is disabled, so that I understand how to make Focus mode available.
6. As a Mission planner, I want the global DevMan header removed in Focus mode, so that it occupies neither visual space nor keyboard navigation.
7. As a Mission planner, I want the Mission selector, Epic card, and statistics removed in Focus mode, so that the planning surface gets the available space.
8. As a Mission planner, I want Focus mode to preserve compact Mission identity, so that I always know which Mission I am changing.
9. As a Mission planner, I want compact identity to show the Jira key and short name, with the Epic summary as fallback, so that it remains useful when optional naming data is absent.
10. As a Mission planner, I want the List/Story Map toggle retained in Focus mode, so that I can switch planning perspectives without exiting.
11. As a Mission planner, I want the Done-hidden indicator retained in Focus mode, so that I know when the cards do not represent the complete Mission.
12. As a Mission planner, I want milestone descriptions retained in Focus mode, so that planning context remains visible.
13. As a Mission planner, I want milestone-description edit controls hidden in Focus mode, so that the focused surface contains only essential actions.
14. As a Mission planner, I want the normal shortcut legend hidden in Focus mode, so that it does not recreate the removed chrome.
15. As a Mission planner, I want the focused List or Story Map to use the full viewport width with ordinary edge padding, so that the mode creates meaningful working space.
16. As a Story Map user, I want horizontal scrolling to remain available in Focus mode, so that wide category layouts remain usable without scaling their content.
17. As a Mission planner, I want the command bar to remain available while scrolling, so that Mission identity and view controls stay in reach.
18. As a Mission planner, I want the Exit Focus control fixed in the upper-right, so that I can always leave the mode.
19. As a Mission planner, I want Focus mode to survive List and Story Map switches, so that changing presentation does not interrupt my workspace.
20. As a Mission planner, I want Focus mode to survive Mission switches within the mounted page, so that I can compare or continue work without restoring the shell repeatedly.
21. As a Mission planner, I want the exit control to remain usable while a replacement Mission is loading, so that I am never trapped in Focus mode.
22. As a Mission planner, I want Focus mode to reset after leaving the Missions route or reloading, so that it remains a transient workspace choice.
23. As a user on a viewport narrower than 1024px, I want Focus mode entry hidden and `Z` ignored, so that an unsupported layout is not exposed.
24. As a Mission planner who narrows the browser below 1024px, I want active Focus mode to exit immediately, so that the page returns to its supported layout.
25. As a Mission planner who widens the browser again, I want Focus mode to remain off, so that a responsive change does not unexpectedly alter the shell.
26. As a keyboard user, I want shortcut events ignored while typing in or inside an editable element, so that text entry cannot trigger Mission actions.
27. As a keyboard user, I want modified, repeated, or already-handled shortcut events ignored, so that Mission shortcuts do not conflict with browser or application commands.
28. As a Mission planner using a modal, I want all Mission shortcuts suppressed, so that background actions cannot run while the modal owns the interaction.
29. As a Mission planner, I want Escape to close the active Mission modal without changing Focus mode, so that closing an editor has one predictable effect.
30. As a Mission planner, I want story detail, category editing, and milestone-description editing to be mutually exclusive, so that modal state cannot overlap.
31. As a Story Map user dragging a story, I want `Z` ignored until the drag ends or is cancelled, so that shell changes cannot invalidate drag measurements or cause accidental drops.
32. As a keyboard user entering Focus mode, I want focus moved to the compact Mission identity, so that my position follows the newly rendered shell.
33. As a keyboard user deliberately leaving Focus mode, I want focus returned to the entry control, so that I retain a predictable navigation position.
34. As a keyboard user affected by an automatic responsive exit, I want focus preserved when possible or moved to normal Mission identity when necessary, so that it is not lost with removed content.
35. As a Mission planner, I want normal mode to show all used numbered milestones, so that every milestone containing a non-rejected story remains available.
36. As a Mission planner, I want Done stories to keep their milestones used even when their cards are hidden, so that filtering does not change the planning structure.
37. As a Mission planner with no used numbered milestones, I want Milestones 1 and 2 available, so that planning can begin immediately.
38. As a Mission planner with used numbered milestones, I want up to the next two milestones after the highest used milestone available, so that near-future planning has predictable destinations.
39. As a Mission planner, I want future milestone synthesis capped at Milestone 10, so that the UI respects Jira's existing value range.
40. As a Mission planner, I do not want earlier numeric gaps synthesized merely because they are gaps, so that the projection follows current planning progression rather than inventing history.
41. As a Mission planner, I want an empty numbered milestone with a saved description shown in normal mode, so that saved planning intent remains accessible.
42. As a Mission planner, I want saved descriptions not to advance the future-milestone window, so that descriptions and actual milestone usage have distinct meanings.
43. As a Mission planner, I want **No milestone** and **Out of scope** shown only when they contain non-rejected stories, so that special planning groups are never synthesized.
44. As a Mission planner encountering an unexpected Jira milestone value, I want its stories retained in an explicitly unknown row, so that malformed data is visible rather than discarded or silently normalized.
45. As a Mission planner, I want rows ordered as **No milestone**, numbered milestones, unknown values, then **Out of scope**, so that both views present the same predictable sequence.
46. As a Mission planner, I want Focus mode to omit every milestone row with no currently visible stories, so that the focused surface contains only active card content.
47. As a Mission planner hiding Done cards, I want complete progress and status counts preserved, so that card visibility does not rewrite milestone truth.
48. As a List user, I want an expanded milestone with no visible stories to say `No stories yet`, so that an intentional empty state is clear.
49. As a List user, I want zero-story rows to omit progress rather than show `0 / 0`, so that the UI does not imply meaningless progress.
50. As a Mission planner, I want separate List and Story Map collapse choices, so that each presentation remembers how I use it.
51. As a Mission planner, I want collapse choices preserved across Focus transitions and temporary row disappearance, so that changing presentation does not erase my workspace state.
52. As a Mission planner switching Missions, I want collapse choices reset, so that state from one Mission does not leak into another.
53. As a List user, I want rows initially collapsed, so that the view starts compactly.
54. As a Story Map user, I want rows initially expanded except **Out of scope**, so that the planning grid is available immediately without emphasizing excluded work.
55. As a Story Map user, I want empty synthesized and described numbered milestones to accept drops in normal mode, so that I can plan stories into future milestones.
56. As a Story Map user, I want numbered milestones, **No milestone**, and **Out of scope** to accept drops, so that stories can move among valid Jira planning values.
57. As a Story Map user, I want unknown rows to allow stories to move out but not accept drops, so that malformed values are not propagated.
58. As a Story Map user, I want collapsed rows not to be drop targets or auto-expand during a drag, so that their interaction remains predictable.
59. As a Story Map user, I want a moved story reflected immediately, so that drag/drop feels responsive while Jira is updated.
60. As a Story Map user, I want further moves of a story disabled while its update is pending, so that concurrent changes cannot race.
61. As a Story Map user, I want a failed update rolled back with a visible error, so that the UI does not claim an unpersisted result.
62. As a Story Map user, I want a successful move retained if the subsequent refresh fails, so that confirmed work is not incorrectly reversed.
63. As a Story Map user, I want the source row to disappear immediately when its last visible story leaves during Focus mode, so that Focus row filtering remains consistent during optimistic updates.
64. As a Mission planner, I want numbered milestone descriptions to be editable in normal mode, so that I can record planning context before stories exist.
65. As a Mission planner, I want only exact numbered milestones accepted by the description API, so that invalid or special planning groups cannot acquire unsupported descriptions.

## Implementation Decisions

- Replace the current combined fold behavior with Focus mode. Normal mode always renders the Mission selector, Epic card, and statistics; it no longer uses folding to remove those sections.
- Keep Focus mode transient and owned exclusively by the Mission page. It survives Mission-key and List/Story Map changes while that page remains mounted, but is not stored in the URL, browser storage, or server state.
- Introduce a small route-agnostic application-chrome interface through which mounted route content can request that global chrome be omitted. The application shell remains responsible for rendering the header and must not know about Missions or Focus mode. A hidden header is not rendered, rather than merely concealed with CSS.
- Use the approved **Command bar** shell from the prototype: a sticky full-width bar above the focused work surface, compact Mission identity on the left, view and filter state grouped in the bar, and a fixed upper-right Exit Focus control. Do not use the prototype's identity-rail or open-canvas variants.
- Compact identity displays Jira key and short name, falling back to Epic summary. Its heading can receive programmatic focus.
- Focus mode is supported when the viewport is at least 1024px wide, matching the existing desktop breakpoint. Availability is based on viewport width, not Mission-content width.
- Below 1024px, hide the entry control and ignore Focus shortcuts. Crossing below the boundary exits Focus mode immediately; crossing back does not restore it.
- At desktop width, show but disable the entry control until current Mission detail has loaded, with a concise explanation. Once Focus mode is active, keep exit available while replacement detail loads. A failed replacement load exits Focus mode only if no valid Mission detail remains.
- Use native `type="button"` controls named `Enter Focus mode` and `Exit Focus mode`. Both expose `aria-keyshortcuts="Z"`; their visible `<kbd>` hint is presentational and is not repeated in the accessible name.
- Enter or exit Focus mode on a non-repeating `Z` keydown, including `Shift+Z`, only when the event is not prevented and has no Ctrl, Cmd, or Alt modifier.
- Centralize Mission shortcut eligibility for `Z`, `R`, and `D`. Ignore shortcuts for `input`, `textarea`, `select`, `contenteditable`, and descendants of editable elements; while any Mission modal is open; and according to modifier, repeat, and `defaultPrevented` safeguards. `Z` also requires a supported viewport, the appropriate detail-loading state, and no active Story Map drag.
- Model story detail, category editing, and milestone-description editing as mutually exclusive states. Opening one closes any other. Escape closes the active modal and leaves Focus mode unchanged.
- On deliberate Focus entry, focus the compact identity heading. On deliberate exit, return focus to the normal entry control. On responsive exit, preserve focus if its target remains; otherwise move it to a focusable normal-mode Mission identity heading.
- Establish one shared milestone workspace beneath the Mission page as the highest behavioral seam consumed by both List and Story Map. It owns projector inputs, per-view collapse state, active-drag state, and optimistic story moves.
- Feed both views typed rows from one exported pure milestone projector rather than allowing each view to group stories independently.
- Each projected row has stable identity based on its canonical Jira milestone value, kind (`unassigned`, `numbered`, `unknown`, or `out-of-scope`), display name, optional milestone number, description, complete `allStories`, filtered `visibleStories`, complete status counts, synthesized state, description editability, and drop eligibility.
- The projector receives raw stories, card-filter state, and the existing milestone-description record. It never receives Focus mode. The workspace applies Focus row visibility after projection.
- Exclude rejected stories before deriving row membership. A used milestone is a numbered milestone assigned to at least one non-rejected story, including Done stories whose cards are hidden.
- Recognize only exact Jira values `Milestone 1` through `Milestone 10` as numbered milestones. Preserve other stored values as unknown rows; do not normalize them.
- Treat Jira's `None` milestone value as the unassigned row displayed as **No milestone**. It is not numbered and is never synthesized. **Out of scope** is also never synthesized.
- Order rows as **No milestone**, numbered milestones ascending, unknown values lexicographically by stored value, then **Out of scope**.
- In normal mode, include every used numbered milestone, up to two milestones immediately after the highest used numbered milestone capped at Milestone 10, and every numbered milestone with a saved non-empty description. When no numbered milestone is used, synthesize Milestones 1 and 2. Do not fill earlier gaps.
- Described milestones do not advance the synthesis window. Only exact numbered-milestone description keys can create otherwise empty rows; ignore invalid persisted keys.
- Include **No milestone**, **Out of scope**, and unknown rows only when they contain at least one non-rejected story.
- In Focus mode, remove every row with zero visible stories after projection. This includes synthesized and described-empty rows. Recompute immediately after optimistic moves so a source row can disappear when its last visible story moves.
- Derive progress and status summaries from `allStories`, not `visibleStories`. Filtering Done cards affects rendered cards only.
- A zero-story List row omits progress and displays `No stories yet` when expanded. A used row whose stories are all hidden remains present in normal mode with complete progress and the same empty-card state.
- Keep separate collapse maps for List and Story Map, keyed by row identity. Preserve them across view and Focus transitions and temporary row removal; reset both when the selected Mission changes.
- List rows initially start collapsed. Story Map rows initially start expanded except **Out of scope**.
- Derive Story Map category columns and cells from each shared row's visible stories. Category layout remains presentation logic rather than becoming part of the shared milestone projector.
- Expanded Story Map rows expose category-cell drop targets. Collapsed rows are not targets and do not auto-expand.
- Numbered rows, **No milestone**, and **Out of scope** accept drops. Unknown rows permit moving stories out but do not accept drops. Empty synthesized and described-numbered rows are targets in normal Story Map but are absent in Focus mode.
- The shared workspace applies story moves optimistically, recomputes projection immediately, persists the canonical Jira milestone value, and prevents additional dragging for that story while the update is pending.
- On persistence failure, roll back and show an error. On persistence success, refresh Mission data and replace optimistic state with the server result. If refresh fails after persistence succeeds, retain the optimistic result, show a non-blocking refresh error, and reconcile on a later refresh. Reset optimistic state on Mission change.
- Retain Story Map's existing horizontal overflow behavior and story-detail opening. Focus mode changes available chrome and row visibility but does not scale planning content.
- Rename user-facing and projected-model references from milestone summary to **milestone description**. Existing API or storage names may remain and be adapted at the projection boundary.
- Enforce milestone-description keys at the server API boundary. Accept only exact values `Milestone 1` through `Milestone 10`; reject all special, malformed, unknown, or out-of-range values. Existing invalid stored keys are ignored rather than cleaned up by this effort.

## Testing Decisions

- Good tests assert externally observable domain or user behavior through production seams. They do not reproduce production algorithms in test files, depend on implementation-private state, use broad snapshots, or treat Tailwind class assertions as proof of actual responsive layout.
- Use the shared milestone workspace as the highest integration seam for Focus state, row presentation, view switching, collapse state, modal precedence, and optimistic moves. Keep lower-level tests only where a pure rule has a richer scenario matrix or the server boundary must independently enforce an invariant.
- Test the production milestone projector and Focus row filter directly. Cover exact milestone recognition, malformed values, ordering, rejected and Done filtering, complete versus visible stories, future synthesis, the Milestone 10 cap, gap behavior, descriptions, row flags, zero-story progress, and Focus row removal.
- Test the production Mission-shortcut guard directly. Cover case and Shift behavior; modifier, repeat, and prevented-event rejection; editable targets and descendants; modal and drag suppression; responsive availability; loaded-detail entry; and exit while replacement detail loads.
- Test optimistic move transitions at the shared workspace or an extracted pure state-transition seam. Cover immediate projection, pending-story locking, persistence rollback, refresh-after-success, successful persistence followed by refresh failure, and Mission-change reset.
- Use React Testing Library with mocked API methods, router support, and a controllable `matchMedia` shim for component and integration behavior. Cover Focus controls and accessible semantics, chrome removal, retained content, route and Mission state lifetime, media-query exits, keyboard and modal precedence, programmed focus movement, separate collapse maps, empty List states, milestone-description editing, drag-state signaling, and application-shell behavior on unrelated routes.
- Run listener lifecycle tests under React Strict Mode or explicitly prove cleanup so keyboard and media-query listeners cannot accumulate.
- Add minimal server-side Vitest support and test the real production validator used at the milestone-description API boundary. Accept exact Milestones 1 through 10 and reject zero, values above 10, zero-padded and case variants, **No milestone**, **Out of scope**, and unknown values. Do not substitute a client-side copy or require Jira route mocks for this invariant.
- Follow the codebase's strongest existing pure-test prior art: import a production derivation helper, construct scenario-oriented fixtures, and assert precedence and edge cases. Extend the existing story fixture approach rather than hand-building repeated Mission data. Do not repeat the existing weaker pattern of copying production filtering or parsing logic into tests.
- Do not add a browser automation framework in this effort. Complete and record a manual pass in one current Chromium desktop browser with mouse and keyboard.
- The manual responsive matrix covers 1023px, 1024px, and a wider desktop viewport. Verify actual visibility, automatic exit without restoration, full-width layout, no overlap, sticky and fixed controls, modal stacking, and absence of unintended scaling.
- The manual Story Map matrix covers horizontal overflow, real dnd-kit geometry, ordinary and empty-row destinations, collapsed and unknown rows, **No milestone**, **Out of scope**, source-row disappearance, pending moves, cancellation, `Z` suppression during dragging, and card click-versus-drag behavior.
- The manual accessibility smoke check covers visible focus, tab order after header removal, accessible Focus control names without duplicate shortcut announcement, responsive and deliberate focus transitions, and Escape while an editor has focus. It is not a comprehensive modal accessibility audit.
- Acceptance requires the complete client test suite, the new server test command, a successful production build, and a recorded Chromium manual-check result.
- Do not require the currently unwired lint command, a numeric coverage threshold, cross-browser certification, or browser-test infrastructure.

## Out of Scope

- Visual scaling, content zooming, or browser-style zoom controls for Story Map.
- Persisting or sharing Focus mode through local storage, URL state, server state, or links.
- Mobile or sub-1024px Focus mode.
- Drag/drop behavior in List view.
- New Jira milestone values, changed Jira storage semantics, or numbered milestones beyond Milestone 10.
- Cleanup or migration of existing invalid milestone-description keys.
- A comprehensive accessibility overhaul of Mission modals, including focus traps, general initial-focus policy, complete focus restoration, or new dialog semantics beyond the Focus-specific keyboard and focus requirements.
- Cross-browser certification or introducing Playwright, Cypress, or another real-browser automation framework.
- Changes to unrelated application routes or their normal global chrome.

## Further Notes

- **Focus mode** is the canonical feature name. It removes UI chrome; it does not scale content.
- **Used milestone**, **visible story**, **unassigned milestone**, **milestone description**, and **synthesized milestone** carry the meanings defined in the project domain glossary.
- Current Jira milestone values remain `Milestone 1` through `Milestone 10`, `None`, and `Out of scope`.
- Preserve established DevMan visual patterns and current desktop behavior rather than introducing a new design system.
- The completed Wayfinder map and its resolved decision tickets remain the detailed decision history. This specification is the implementation handoff.
