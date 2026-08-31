Type: grilling
Status: resolved
Blocked by: 02, 03, 04

## Question

Synthesize the bulk-fetch research (ticket 02) and both prototypes (tickets 03, 04) into one concrete, implementation-ready build spec: the exact backend endpoint/response contract (subtask `issuelinks` + `labels` shape, filtered to intra-story edges, per ticket 02), the exact frontend component structure (Wayfinder tab with a Pan & Zoom graph view as default per ticket 04, and a Frontier/Claimed/Blocked/Done grouped list view as fallback per ticket 03, plus the toggle between them and the ~14-ticket/55%-fit threshold from ticket 04 as guidance for which to default to), and where the `wayfinder:<type>` label convention and derived-state rules (frontier/claimed/unblocked) get documented so they aren't just tribal knowledge in this map — likely `.github/instructions/domain-logic.instructions.md` or a new doc referenced from `CLAUDE.md`.

Note the open caveat from ticket 02 in the spec: the real "Blocks" link-type `inward`/`outward` strings should be confirmed against the live Jira instance (ticket 05) before the build session hardcodes them — the spec can flag this as a pre-build verification step rather than being blocked on it.

## Answer

Four remaining decisions were closed via a grilling round (data delivery shape, Story-label detection, where derived state is computed, doc location) — all four of the recommended answers were confirmed as-is. Full build-ready spec below.

**Pre-build verification step: none.** Ticket 05 closed ticket 02's caveat against the live Jira instance — `type.id: "10000"`, `type.name: "Blocks"`, `inward: "is blocked by"`, `outward: "blocks"` are confirmed, not assumed.

### Backend

**1. Story-level `labels` (cheap, always-loaded, gates tab visibility)**

In `getStoryDetail()` (`packages/server/src/services/missions.ts:401`), add `"labels"` to the Story's own top-level `fields` array (currently `["summary", "status", "issuetype", "description", "subtasks", "customfield_11101", "customfield_10000", "customfield_11461"]`). Map it into a new `labels: string[]` field on the returned object and on `StoryDetailResponse` (`packages/client/src/api/client.ts:172`) — same shape/precedent as `SubtaskItem.labels` already has.

The client gates the whole tab on `detail.labels.includes("wayfinder:map")` — no server-side gating needed, this is presentation logic.

**2. New lazy endpoint for the expensive per-ticket data**

New route, registered **before** the generic `GET /stories/:storyKey` handler (route-ordering rule in CLAUDE.md — insert directly after the existing `GET /stories/:storyKey/github` block at `packages/server/src/routes/missions.ts:85-95`, same shape):

```
GET /api/missions/stories/:storyKey/wayfinder
```

New service function `getStoryWayfinder(storyKey: string): Promise<WayfinderResponse>` in `missions.ts`. It re-runs the same subtask-key discovery `getStoryDetail` already does (`subtaskKeys` from the Story's `fields.subtasks`), then re-queries subtasks via `searchForIssuesUsingJqlEnhancedSearch` with `fields: ["summary", "status", "assignee", "updated", "labels", "issuelinks"]` (ticket 02's one-field addition — `issuelinks` — on top of the existing subtask field list; `customfield_10000`/PR state is irrelevant here so it's dropped from this query).

Parse `issuelinks` following `launchpad.ts:100-120`'s exact pattern (`type.name === "Blocks"` — or `type.id === "10000"` for robustness — `inwardIssue ?? outwardIssue`), but split by direction instead of taking the first match:
- An entry with `outwardIssue` and `type.outward === "blocks"` → that issue's key goes in `blocks`.
- An entry with `inwardIssue` and `type.inward === "is blocked by"` → that issue's key goes in `blockedBy`.

Filter both lists to keys inside this Story's own `subtaskKeys` set (per ticket 02's note and the self-contained-per-Story scope decision in ticket 01/map Notes) — a link to a ticket outside this Story's subtask tree is silently dropped, not surfaced as a dangling edge.

Derive `type` per ticket from its `labels`: first label matching `wayfinder:(research|prototype|grilling|task)`, `null` if none present (shouldn't happen for a real fixture, but the type must tolerate it rather than throw).

**Response contract** (new shared type, define once and import both sides — server return type and `packages/client/src/api/client.ts`):

```ts
export type WayfinderTicketType = "research" | "prototype" | "grilling" | "task" | null;

export interface WayfinderTicket {
  key: string;
  summary: string;
  status: string;
  statusCategory: string; // "new" | "indeterminate" | "done"
  assignee: string; // "Unassigned" sentinel, same convention as SubtaskItem
  avatarUrl: string | null;
  type: WayfinderTicketType;
  blockedBy: string[]; // keys, intra-story only
  blocks: string[];    // keys, intra-story only
}

export interface WayfinderResponse {
  storyKey: string;
  tickets: WayfinderTicket[];
}
```

No `derivedState` field — raw data only, per decision 3 below.

Client method, mirroring `getStoryGithub` exactly (`packages/client/src/api/client.ts:286-287`):

```ts
getStoryWayfinder: (storyKey: string) =>
  fetchJson<WayfinderResponse>(`/missions/stories/${encodeURIComponent(storyKey)}/wayfinder`),
```

### Frontend

**3. Derived state — computed client-side**

New file `packages/client/src/components/wayfinderUtils.ts`, sibling to `statusUtils.tsx`, unit-tested the same way (`wayfinderUtils.test.ts`):

```ts
export type DerivedState = "frontier" | "claimed" | "blocked" | "done";

export function deriveState(ticket: WayfinderTicket, all: WayfinderTicket[]): DerivedState {
  if (ticket.statusCategory === "done") return "done";
  if (ticket.assignee !== "Unassigned") return "claimed";
  const unresolvedBlocker = ticket.blockedBy.some((key) => {
    const blocker = all.find((t) => t.key === key);
    return !blocker || blocker.statusCategory !== "done";
  });
  return unresolvedBlocker ? "blocked" : "frontier";
}
```

(States are mutually exclusive and evaluated in that order — Done wins over Claimed, matching ticket 01's Answer: "Claimed is a derived state... assignee is set AND status is not in the Done category," so a Done+assigned ticket is Done, not Claimed.)

Also export a small `WAYFINDER_TYPE_ICON` / `DERIVED_STATE_ICON` config map (lucide icons, following `LabelIcons.tsx`'s exact `{ icon, tooltip, color }` shape) for the icon-only badges the graph view needs: e.g. `FlaskConical` for prototype, `BookOpen`/`Search` for research, `MessageCircle` for grilling, `CheckSquare` for task, `Flag` for frontier.

**4. Tab wiring in `StoryDetailModal.tsx`**

- Extend the `activeTab` union (line 185) to add `"wayfinder"`.
- Conditionally render a tab button, gated on `detail.labels.includes("wayfinder:map")` — same conditional pattern as the "Implementation Plan" tab's `detail.implementationPlan != null` guard (lines 287-298), not the always-present "Details"/"Comments" tabs.
- Lazy-load on click, mirroring `handleGithubTab` (lines 217-228) exactly: a new `handleWayfinderTab` sets the tab, then fetches `api.missions.getStoryWayfinder(storyKey)` into new `wayfinderData`/`wayfinderLoading`/`wayfinderError` state, only if not already loaded — same loading/error rendering branch shape as the `github` tab's content block (lines 386-394).

**5. New components**

- `WayfinderTab.tsx` (container, sibling to `GitHubPrTab.tsx`): owns `view: "graph" | "list"` state, defaulting to `"graph"` unless `tickets.length >= 14` (the ticket-count half of ticket 04's threshold — pre-render fit-scale isn't knowable before the graph lays out, so only the ticket-count trigger can gate the *initial* default; the toggle is always available regardless of the default). Renders a small segmented Graph/List switcher plus the active view.
- `WayfinderGraph.tsx`: pan & zoom canvas per ticket 04's Variant B — fixed-height viewport, drag-to-pan, +/− zoom buttons, full-size nodes always. Layout: layer = 1 + max(layer of blockers) via `blockedBy`, roots (no blockers) at the top, arrows drawn blocker → blocked, top-to-bottom, with a one-line legend above the canvas stating the direction convention. Node card per ticket 04's redesign: 2-line-clamp summary as the dominant text, icon-only type badge + icon-only frontier badge (tooltip = full label, using the config from step 3), muted small-mono key (plain text, **not** a `JiraLink` — deprioritized per the prototype answer), status as a colored dot (reuse `getStatusStyle(status).dotColor` from `statusUtils.tsx`, same convention `SubtaskKanban` already uses), assignee as the existing avatar-or-initials chip pattern (copy the exact markup from `SubtaskKanban`, lines 151-159).
- `WayfinderList.tsx`: four sections in fixed order — **Frontier — takeable now**, **Claimed**, **Blocked**, **Done** — each with a count header, tickets as compact rows (type icon badge, `JiraLink`, truncated summary, blocked-by count, assignee chip), per ticket 03's Variant B. Group tickets via `deriveState`.

Both new view components take `tickets: WayfinderTicket[]` and derive everything else internally (no server-shaped `derivedState` to thread through).

### Documentation

**6. Wayfinder label/link convention → new section in `.github/instructions/domain-logic.instructions.md`**, not a new file (same category of undocumented Jira tribal knowledge this doc already exists for, per CLAUDE.md's own pointer). Section should cover, sourced from tickets 01/02/05's answers:
- `wayfinder:map` Story label marks a Story as a Wayfinder map; its Subtasks are the map's tickets.
- `wayfinder:<research|prototype|grilling|task>` Subtask labels give each ticket its type.
- Dependencies are native Jira `Blocks`/`is blocked by` issue links — `type.id: "10000"`, `type.name: "Blocks"`, `inward: "is blocked by"`, `outward: "blocks"` (confirmed live, not Jira's uneditable default — admin-editable per instance, so prefer `type.id` if this ever needs re-verifying).
- Derived-state rules: Done (status category done) → Claimed (assignee set, not done) → Blocked (has an unresolved non-done blocker) → Frontier (none of the above) — evaluated in that precedence order.
- Scope note: dependency edges are filtered to intra-story only; a link to a ticket outside the Story's own subtask tree is dropped, not surfaced (self-contained-per-Story is a v1 boundary, see the map's "Not yet specified").

### What's still left to the build session (deliberately not specified further here)

- Exact pixel/spacing/Tailwind class choices beyond what's already fixed by matching `SubtaskKanban`/`statusUtils` conventions.
- The precise pan/zoom interaction implementation (library vs. hand-rolled — the prototype at [prototypes/04-graph-view.tsx](../prototypes/04-graph-view.tsx) is the reference implementation to adapt, not a library recommendation).
- Test coverage shape for `wayfinderUtils.deriveState` (should exist, per the `statusUtils.test.ts` precedent, but the specific cases are a build-time TDD concern).
