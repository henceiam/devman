# 09: Introduce the responsive Focus-mode shell

**What to build:** Let desktop Mission planners enter a transient, full-width Focus mode using the approved Command bar shell. The mode removes global and Mission chrome without scaling content, retains compact Mission identity and essential controls, and follows the specified loading, navigation, and responsive lifetime.

**Blocked by:** None (can start immediately).

**Status:** completed

- [x] Mission page exclusively owns transient Focus state; it survives Mission and List/Story Map switches while the page remains mounted and resets after navigation away or remounting.
- [x] A route-agnostic application-chrome interface lets mounted content request header omission without coupling the shell to Missions or Focus mode.
- [x] The global header is not rendered while suppressed, removing it from layout, keyboard navigation, and the accessibility tree, while unrelated routes retain normal chrome.
- [x] Focus mode uses the approved sticky, full-width **Command bar** shell with compact Jira key and short name, falling back to Epic summary, plus the view toggle and Done-hidden indicator.
- [x] A fixed upper-right Exit Focus control remains available above the full-width List or Story Map work surface; Story Map horizontal overflow is preserved and content is not scaled.
- [x] Focus mode removes the Mission selector, Epic card, statistics, shortcut legend, and milestone-description edit controls while retaining milestone descriptions and story access.
- [x] At viewport widths of at least 1024px, the entry control is visible but disabled with a concise explanation until valid Mission detail is loaded.
- [x] Below 1024px, the entry control is hidden; crossing below the boundary exits active Focus mode immediately, and growing the viewport does not restore it.
- [x] During a Mission switch, Focus mode and its exit control remain available while replacement detail loads; a failed load exits Focus mode only when no valid detail remains.
- [x] The old combined fold behavior and query-string Focus prototype path no longer control the Mission presentation.
- [x] Integration tests cover shell suppression, retained and removed content, loading state, Mission/view lifetime, route remounting, and controlled responsive transitions.
- [x] Existing client tests and the production build pass.

## Completion

Implementation commit: `434186f`
