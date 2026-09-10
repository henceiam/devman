# Decide Focus state and application-shell ownership

Type: grilling
Status: resolved
Blocked by:

## Question

Where should transient Focus state live, and what interface should the Mission page use to suppress global application chrome without coupling Mission-specific rendering to the global shell or affecting other routes?

## Answer

- `MissionPage` exclusively owns the transient `isFocusMode` state.
- Because `MissionPage` remains mounted across Mission-key and List/Story Map changes, Focus mode survives those switches. Leaving the Missions route unmounts the page and resets Focus mode as required.
- The application shell provides a small route-agnostic `AppChromeContext` and declarative hook, conceptually `useAppChrome({ headerHidden: isFocusMode })`.
- The shell remains responsible for rendering global chrome. It must not know about Missions or Focus mode, and `MissionPage` exposes only the requested chrome state.
- While the header is suppressed, `AppContent` does not render it. This removes its controls from layout, keyboard navigation, and the accessibility tree rather than merely hiding it visually.
- Do not lift Mission-specific Focus state into `AppContent`, pass shell setters through route props, or coordinate the boundary through CSS or DOM selectors.
