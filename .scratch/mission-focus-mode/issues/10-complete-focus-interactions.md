# 10: Complete Focus-mode keyboard and modal interactions

**What to build:** Make Focus mode and existing Mission shortcuts predictable and accessible for keyboard users. One eligibility policy governs Mission shortcuts, modal states cannot overlap, Escape has one effect, focus follows shell transitions, and active Story Map drags cannot accidentally toggle Focus mode.

**Blocked by:** 09: Introduce the responsive Focus-mode shell.

**Status:** completed

- [x] Native `type="button"` controls are named `Enter Focus mode` and `Exit Focus mode`, expose `aria-keyshortcuts="Z"`, and show a presentational `Z` key hint that is not duplicated in their accessible names.
- [x] A non-repeating `Z` keydown, including `Shift+Z`, toggles Focus mode only when the event is not prevented and has no Ctrl, Cmd, or Alt modifier.
- [x] One shared eligibility rule applies repeat, modifier, `defaultPrevented`, editable-target, and modal safeguards to `Z`, `R`, and `D`.
- [x] Events from an `input`, `textarea`, `select`, `contenteditable` element, or a descendant of an editable element do not trigger Mission shortcuts.
- [x] Story detail, category editing, and milestone-description editing are mutually exclusive; while one is open, all Mission shortcuts are suppressed.
- [x] Escape closes the active Mission modal without changing Focus mode.
- [x] `Z` is ignored during an active Story Map drag and becomes available again after drag end or cancellation.
- [x] Focus entry additionally requires a supported desktop viewport and loaded Mission detail, while deliberate Focus exit remains available during replacement-detail loading.
- [x] Entering Focus mode by button or shortcut focuses the compact Mission identity heading; deliberate exit restores focus to the entry control.
- [x] Responsive exit preserves focus when its target remains rendered and otherwise moves focus to a focusable normal-mode Mission identity heading.
- [x] Pure tests cover the production shortcut guard, and integration tests cover modal precedence, drag suppression, accessible controls, Escape behavior, and programmed focus movement.
- [x] Listener lifecycle is verified under React Strict Mode or by explicit cleanup assertions so keyboard and media-query listeners cannot accumulate.
- [x] Existing client tests and the production build pass.

## Completion

Implementation commit: `5ee1c25`
