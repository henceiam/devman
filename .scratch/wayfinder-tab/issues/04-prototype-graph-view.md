Type: prototype
Status: open
Blocked by: 01

## Question

What should the default graph (DAG-style, nodes + arrows) view of the Wayfinder tab look like? Build a rough, reactable mock (can use synthetic/mock dependency data — doesn't need to wait on ticket 02 or 05), legible inside the existing Story detail modal's content area (`packages/client/src/components/StoryDetailModal.tsx`, a `max-w-3xl` modal with a scrollable body). Cover: node content (ticket key, type, status, assignee), edge direction convention, how frontier tickets are visually flagged, and what happens when the graph doesn't fit (pan/zoom vs. shrink vs. scroll) — the answer should also say when this view gets too cluttered to be useful, since the list view (ticket 03) exists as the fallback for exactly that case.
