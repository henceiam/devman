# Mission Focus Mode

Label: wayfinder:map

## Destination

An [implementation-ready specification](spec.md) for Mission-page cleanup: a desktop Focus mode across List and Story Map views, plus predictable future-milestone planning and description editing.

## Notes

- This is a planning effort. Implementation is handed off after the route is clear.
- Use the `grilling`, `domain-modeling`, and `prototype` skills where named by a ticket.
- Call the feature **Focus mode**. `Z` toggles it; it removes UI chrome but does not scale content.
- Focus mode replaces the current combined fold behavior. Normal mode always shows the Mission selector, Epic card, and statistics.
- Focus mode applies to List and Story Map, hides the global DevMan header plus Mission selector/Epic card/statistics, and retains a compact read-only Mission identity.
- Retain the view toggle, Done-hidden indicator, drag/drop, and story-detail opening in Focus mode. Hide the shortcut legend, milestone-summary edit buttons, and all milestones with no currently visible stories. Keep milestone descriptions visible.
- Keep a fixed upper-right Focus-mode control showing the `Z` shortcut. The control is unavailable until a Mission is loaded.
- `Z` is ignored for editable targets, open modals, and Ctrl/Cmd/Alt-modified events. Escape remains owned by modals.
- Focus mode is transient: it resets on reload/navigation away but survives Mission and view switches within the mounted page.
- Focus mode is desktop-only. Story Map horizontal scrolling remains the existing desktop behavior.
- Preserve users' milestone collapse state when entering or leaving Focus mode.
- In normal mode, show used numbered milestones, up to two numbered milestones after the highest used milestone, and empty milestones that have saved descriptions. Start with Milestones 1 and 2 when none are used; never exceed Milestone 10; do not fill earlier numeric gaps merely because they are gaps.
- Determine used milestones from all non-rejected stories, including Done stories hidden by the card filter. Never synthesize `No milestone` or `Out of scope`.
- Synthesized future milestones are summary-editable and are drag targets in Story Map. In List view they open to a `No stories yet` empty state.
- Existing Jira milestone values remain `Milestone 1` through `Milestone 10`, plus `None` and `Out of scope`; this effort does not change Jira storage semantics.
- UI implementation must preserve established DevMan visual patterns and support current desktop layouts.

## Decisions so far

- [Prototype the Focus mode shell](issues/01-prototype-focus-mode-shell.md): Use the sticky full-width **Command bar** shell, with compact Mission identity and view state above the focused content plus a fixed upper-right exit control.
- [Decide the desktop Focus mode boundary](issues/02-decide-desktop-focus-boundary.md): Enable full-width Focus mode from 1024px, hide and disable entry below it, and automatically exit when crossing beneath it.
- [Decide Focus state and application-shell ownership](issues/03-decide-focus-state-and-shell-ownership.md): Keep transient Focus state in `MissionPage` and declaratively suppress the unrendered global header through a route-agnostic application-chrome context.
- [Decide the milestone projection seam](issues/04-decide-milestone-projection-seam.md): Feed both views typed rows from one pure projector and stable workspace, separating complete milestone planning state from card visibility while centralizing synthesis, descriptions, collapse, and optimistic drag behavior.
- [Decide Focus interaction precedence](issues/05-decide-focus-interaction-precedence.md): Use one guarded Mission-shortcut contract, suppress shortcuts for mutually exclusive modals and active drags, and give responsive Focus transitions deterministic accessible controls and focus behavior.
- [Decide implementation acceptance coverage](issues/06-decide-acceptance-coverage.md): Automate every deterministic rule at focused production seams, add narrow server validation tests, and reserve a documented Chromium pass for real layout, focus presentation, and drag geometry.

## Not yet specified

## Out of scope

- Actual visual scaling or browser-style zooming of Story Map content.
- Persisting or sharing Focus mode through local storage or URL state.
- Mobile Focus mode.
- Adding drag/drop behavior to List view.
- Changing Jira milestone values or supporting milestones beyond Milestone 10.
- A comprehensive accessibility overhaul of Mission modals beyond the Escape behavior and shortcut suppression required by Focus mode.
