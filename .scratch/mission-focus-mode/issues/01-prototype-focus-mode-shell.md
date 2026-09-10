# Prototype the Focus mode shell

Type: prototype
Status: resolved
Blocked by:

## Question

What exact desktop layout makes Focus mode useful in both List and Story Map views while retaining compact Mission identity, the view toggle, Done-hidden state, live Story Map drag/drop, story details, and a clear fixed `Z` exit control without recreating the chrome the mode removes?

## Comments

- Prototype ready for human review in [`FocusModePrototype.tsx`](../../../packages/client/src/components/FocusModePrototype.tsx). Open an existing Mission URL with `?focusPrototype=A`, then use the bottom switcher or Left/Right arrows to compare **Command bar**, **Identity rail**, and **Open canvas**.

## Answer

Use variant A, **Command bar**, as the Focus-mode shell:

- A sticky, full-width bar at the top of the focused work surface.
- Compact Mission identity on the left: Jira key and short name, falling back to the Epic summary.
- List/Story Map toggle and the Done-hidden indicator grouped in the bar.
- A fixed upper-right `Exit Focus` control that displays the `Z` shortcut.
- List or Story Map content occupies the full-width area below the bar.
- Milestone descriptions remain visible, while summary-edit controls and the normal shortcut legend are absent.
- Do not use the persistent identity rail from variant B or the detached floating controls from variant C.

The prototype review surfaced no additional presentation or accessibility requirements beyond the existing map constraints.
