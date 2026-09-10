# Decide the desktop Focus mode boundary

Type: grilling
Status: resolved
Blocked by: 01

## Question

After reacting to the Focus-mode shell prototype, what viewport boundary enables Focus mode, how is the control treated below that boundary, and what should happen if an active desktop Focus session crosses below it?

## Answer

- Focus mode is available at viewport widths of 1024px and above, matching Tailwind's existing `lg` breakpoint.
- Below 1024px, hide the Focus mode control and ignore the `Z` shortcut.
- If an active Focus mode session crosses below 1024px, exit Focus mode immediately. Growing the viewport again does not restore it automatically.
- The boundary is based on viewport width, not the width of the Mission content.
- While available, the Focus-mode command bar and work surface use the full viewport width with only normal edge padding and no centered maximum-width container. Story Map retains horizontal scrolling when its columns exceed the available width.
