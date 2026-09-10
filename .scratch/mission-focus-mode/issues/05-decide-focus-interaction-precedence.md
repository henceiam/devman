# Decide Focus interaction precedence

Type: grilling
Status: resolved
Blocked by: 01

## Question

What is the complete keyboard, modal, focus, and drag interaction contract for entering and leaving Focus mode, including accessible button semantics and precedence among `Z`, editable elements, open modals, modifier keys, and viewport availability?

## Answer

- Focus mode toggles on a non-repeating `Z` keydown, including `Shift+Z`, only when the event has not been prevented and has no Ctrl, Cmd, or Alt modifier. Plain `Z` does not need `preventDefault()`.
- Ignore Mission shortcuts when the event target is an `input`, `textarea`, `select`, a `contenteditable` element, or a descendant of one. Use one shared editable-target rule for `Z`, `R`, and `D`.
- Apply the same modifier, repeat, `defaultPrevented`, editable-target, and modal safeguards to all Mission shortcuts. `Z` additionally requires the desktop viewport, loaded Mission detail for entry, and no active Story Map drag.
- Treat story detail, category editing, and milestone-description editing as mutually exclusive modal states. Opening one closes any other. While one is open, suppress all Mission shortcuts; Escape closes the modal without changing Focus mode.
- Ignore `Z` while a Story Map drag is active. Re-enable it after drag end or cancellation so changing the shell cannot invalidate drag measurements or cause an accidental drop.
- Entry requires a viewport at least 1024px wide and current Mission detail that is not loading. At desktop width, keep the entry button visible but disabled until the detail is loaded, with a concise explanation such as `title="Load a Mission to use Focus mode"`. Hide it below 1024px.
- Once active, Focus mode survives a Mission switch and keeps its exit control usable during detail loading. A failed load exits Focus mode only when no valid Mission detail remains. Crossing below 1024px always exits immediately and growing the viewport does not restore Focus mode.
- Provide native `type="button"` controls named `Enter Focus mode` and `Exit Focus mode`. Both show a presentational `<kbd>` hint for `Z` and expose `aria-keyshortcuts="Z"`; the key hint is not duplicated in the accessible name.
- On entry by button or shortcut, focus the programmatically focusable Mission identity heading in the Focus command bar. On a deliberate exit by button or shortcut, return focus to the normal-mode entry button.
- On automatic responsive exit, preserve focus if its target remains rendered. If the focused element disappears with the Focus shell, move focus to a programmatically focusable normal-mode Mission identity heading because the entry button is hidden below 1024px.
- This effort requires consistent Escape handling and shortcut suppression for the three Mission modals. A broader modal accessibility overhaul, including focus traps, comprehensive focus restoration, initial-focus policy, `role="dialog"`, and `aria-modal`, is outside this effort.
