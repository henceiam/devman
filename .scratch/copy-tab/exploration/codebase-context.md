# Copy tab — codebase context for implementers

Verified against the working tree at commit `d7037f7` (post mission-focus-mode merge, 2026-09-10). All line numbers below were read from the **current** tree. Where the spec's "Code seams" section (`.scratch/copy-tab/spec.md` lines 129–143) cites stale line numbers, the correction is flagged with **DRIFT**.

Related artifacts (already in `.scratch/copy-tab/`):
- `spec.md` — the contract (read this first; do not redesign).
- `research/reference-table-and-field-schema.md` — canonical ADF template JSON (lines 27–226 of that file), field schemas, concurrency conclusion.
- `issues/02-decide-safe-jira-read-write-contract.md` — typed outcomes, status codes.
- `prototypes/CopyTabPrototype.tsx` — decided presentation = **variant A** (field sections, lines 82–100). Its `TranslationTable` (lines 30–50), `EmptyAction` (52–66), and `ConflictNotice` (68–75) are the visual reference for the real `CopyTab`.

---

## 1. Server seams

### 1a. `packages/server/src/services/missions.ts` (787 lines total)

**`getClient()` definition/scope** — lines 5–25. Module-level `let client: Version3Client | null = null;` and a private `function getClient(): Version3Client` that lazily builds the client from `config.jira.{host,email,apiToken}`. This is the "duplicated Jira client" — the same pattern exists in `services/jira.ts:4–24` and `services/launchpad.ts:5–25`. Per spec seam 1, the initialize service function goes in `missions.ts` and reuses this module-local `getClient()`; do NOT create a third copy.

**`StoryDetailResponse` interface** — **lines 87–99** (spec said 87–99 ✓, matches):

```ts
// missions.ts:87-99
export interface StoryDetailResponse {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  issuetype: string;
  description: unknown | null;
  acceptanceCriteria: unknown | null;
  implementationPlan: unknown | null;
  subtasks: SubtaskItem[];
  prState: PrState | null;
  labels: string[];
}
```

Add `copy: IssueCopyData;` here. **Note: `labels: string[]` is already present** (line 98) and populated (line 497) — see §4 for what that means for eligibility gating. New types (`AdfNode`, `AdfDocument`, `IssueCopyData`, `InitializeTranslationKeysResponse`) should be defined near this interface and duplicated by hand into the client's `api/client.ts` (repo convention per CLAUDE.md).

**`getStoryDetail` fields array** — **line 423** (spec said `:423` ✓, matches exactly):

```ts
// missions.ts:418-424
export async function getStoryDetail(issueKey: string): Promise<StoryDetailResponse> {
  const jira = getClient();
  const result = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key = "${issueKey}"`,
    maxResults: 1,
    fields: ["summary", "status", "issuetype", "description", "subtasks", "customfield_11101", "customfield_10000", "customfield_11461", "labels"],
  });
```

Add `"customfield_11302"` and `"customfield_11285"` to that array. (`"labels"` is already there.)

**Detail response population object literal** — **lines 486–498** (spec said `:486–498` ✓, matches):

```ts
// missions.ts:486-498
  return {
    key: issue.key!,
    summary: issue.fields.summary,
    status: issue.fields.status?.name ?? "Unknown",
    statusCategory: issue.fields.status?.statusCategory?.key ?? "new",
    issuetype,
    description: issue.fields.description ?? null,
    acceptanceCriteria: (fields.customfield_11101 as unknown) ?? null,
    implementationPlan: (fields.customfield_11461 as unknown) ?? null,
    subtasks,
    prState: parsePrField(fields.customfield_10000 as string | null),
    labels: (fields.labels as string[] | null) ?? [],
  };
}
```

Add `copy: ...` to this literal, built from `fields.customfield_11302` / `fields.customfield_11285` (see below for the shape of each).

**Precedent reading `customfield_11302` as `{ value }`** — **line 268** (spec said `~268` ✓, exact), inside `fetchStories`:

```ts
// missions.ts:268
copyStatus: (fields.customfield_11302 as { value: string } | null)?.value ?? null,
```

Same pattern used for `customfield_11477` (milestone, line 266) and `customfield_11357` (size, line 265). The live Jira response for `customfield_11302` is `{ value: string, id: string, self: string } | null` (research doc line 13) — tolerate the extra `id`/`self` keys.

**`editIssue` precedent** — **lines 410–414** (spec said `:410–414` ✓, exact), inside `updateStory`:

```ts
// missions.ts:410-414
  await jira.issues.editIssue({
    issueIdOrKey: issueKey,
    fields,
    notifyUsers: false,
  });
```

Second precedent: `launchpad.ts:68–75` (`setHideUntilDate`) — same call with `fields: { customfield_11465: date || null } as Record<string, unknown>`. Also `missions.ts:336–348` (`updateEpicColumns`). The jira.js type for `fields` is `IssueUpdateDetails` (see `node_modules/jira.js/out/version3/parameters/editIssue.d.ts`): `editIssue` accepts `{ issueIdOrKey, fields?, update?, notifyUsers?, returnIssue?, ... }` and returns `Promise<void>` by default. For ADF write: `fields: { customfield_11285: <AdfDocument> }`, `notifyUsers: false`.

**Not-found (404) handling in `getStoryDetail` today** — **lines 426–427**: the search-based fetch returns zero issues for a nonexistent key, and the code throws a plain `Error`:

```ts
// missions.ts:426-427
  const issue = result.issues?.[0];
  if (!issue) throw new Error(`Story not found: ${issueKey}`);
```

The route (`routes/missions.ts:117–127`) catches it and returns **500** `{ error: message }` — there is currently NO 404 mapping. Same `Story not found` throw pattern at `missions.ts:522–523` (`getStoryWayfinder`) and `missions.ts:621–622` (`getStoryGithub`). For the new initialize endpoint the spec requires real `404` — the route handler must distinguish this (e.g. a custom error class or message check) instead of the blanket 500.

### 1b. `packages/server/src/routes/missions.ts` — full route table, registration order

Router created at line 5 (`export const missionsRouter: IRouter = Router();`), mounted at `/api/missions` in `src/index.ts:20`. **Every route, in registration order** (line numbers = handler start):

| # | Line | Method | Path | Service call |
|---|---|---|---|---|
| 1 | 7 | GET | `/` | `getMissions()` |
| 2 | 18 | GET | `/:key/milestone-summaries` | `getMilestoneSummaries(key)` |
| 3 | 29 | PUT | `/:key/milestone-summaries/:milestoneName` | `setMilestoneSummary(...)` → 204 |
| 4 | 48 | GET | `/:key` | `getMissionDetail(key)` |
| 5 | 64 | PATCH | `/:key/columns` | `updateEpicColumns(key, columns)` → 204 |
| 6 | 81 | GET | `/stories/:storyKey/comments` | `getStoryComments(storyKey)` |
| 7 | 93 | GET | `/stories/:storyKey/github` | `getStoryGithub(storyKey)` |
| 8 | 105 | GET | `/stories/:storyKey/wayfinder` | `getStoryWayfinder(storyKey)` |
| 9 | 117 | GET | `/stories/:storyKey` | `getStoryDetail(storyKey)` |
| 10 | 129 | PATCH | `/stories/:storyKey` | `updateStory(...)` → `{ ok: true }` |

Every handler follows the same try/catch → `res.status(500).json({ error: message })` pattern (CLAUDE.md requires new endpoints follow it; extend it to map the typed 404/409/422/502 outcomes for the initialize route).

**Route-ordering note** (from CLAUDE.md, still true): `/stories/:storyKey` GET is registered at line 117 **after** its `/comments`, `/github`, `/wayfinder` subroutes so Express doesn't swallow the suffix into `:storyKey`.

**Where to register the new route**: `POST /issues/:issueKey/copy/translation-keys/initialize`. Spec seam 1 says the `/issues/` prefix is new on this router and cannot collide with `/stories/:storyKey` — **verified true**: no `/issues/*` route exists anywhere in the file. Registration order vs. `GET /:key` (line 48) does not matter because the method differs (POST vs GET) and the path has three extra segments, but placing it after the `/stories/*` block (i.e. after line 140, end of file) keeps the file's grouping readable.

### 1c. `packages/server/src/services/jira.ts` — what the wrapper exposes

Version used: `jira.js@4.1.3` (`node_modules/.pnpm/jira.js@4.1.3`). `services/jira.ts` itself does **not** re-export the client — each service module has its own private `getClient()`. The `Version3Client` (see `node_modules/jira.js/out/version3/client/version3Client.d.ts:96–165`) exposes these namespaces used or relevant here:

- `jira.issueSearch` — `searchForIssuesUsingJqlEnhancedSearch(params)` (**lines 220/241 of `issueSearch.d.ts`**; GET `/rest/api/3/search/jql`). Params: `{ jql, nextPageToken?, maxResults?, fields?, expand?, properties?, fieldsByKeys?, failFast?, reconcileIssues? }`. Returns `Models.SearchAndReconcileResults` with `issues?: ...[]` and optional `nextPageToken` (cursor pagination; precedent in `launchpad.ts:246–266`). The old `searchForIssuesUsingJql` still exists in the client (lines 80/97) but **must not be used** — Jira returns HTTP 410 for it (per CLAUDE.md).
- `jira.issues` — `getIssue({ issueIdOrKey, fields?, expand?, ... })` → `Promise<Models.Issue>` (`issues.d.ts:443`), and `editIssue({ issueIdOrKey, fields, notifyUsers })` → `Promise<void>` (`issues.d.ts:499`).
- Also present: `jira.issueComments.getComments` (used at `missions.ts:587`), `jira.issueProperties.{getIssueProperty,setIssueProperty}` (used at `missions.ts:310/329`), `jira.myself.getCurrentUser`, `jira.projects.searchProjects`, `jira.labels`.

**Key choice for implementers**: spec says reads go through `jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch` (never `getIssue`). For eligibility + field reads, query `jql: \`key = "${issueKey}"\`` with `fields: ["labels", "customfield_11302", "customfield_11285"]` and read `issue.fields.project.key` — note the detail fetch at line 423 does **not** currently request `"project"`, so add it where needed. Project key is also derivable from the key prefix (`EBBACKLOG-…`), but the spec's eligibility step says "fetches the issue's project", so request the field explicitly.

### 1d. How the server detects Jira "issue does not exist" today

Only one place checks HTTP status from jira.js — `services/missions.ts:315–318` (in `getMilestoneSummaries`):

```ts
// missions.ts:315-318
  } catch (err: any) {
    if (err?.status === 404 || err?.statusCode === 404) return {};
    throw err;
  }
```

jira.js 4.1.3 throws `HttpException` (`out/clients/httpException.d.ts:16–58`) which carries a `readonly status: number` (line 51) — `statusCode` is checked defensively but `status` is the documented property. **This dual check is the established precedent for detecting 404**; reuse it in the initialize service. Note the search-based read (`searchForIssuesUsingJqlEnhancedSearch` with `key = "..."`) does NOT 404 for a missing issue — it returns an empty `issues` array, so the service must treat `result.issues?.[0]` being undefined as the not-exists case (same as `missions.ts:426–427` today) and translate it to a 404 at the route layer.

---

## 2. Client seams

### 2a. `packages/client/src/api/client.ts` (376 lines)

**`fetchJson` helper** — lines 1–10, exact current code:

```ts
// client.ts:1-10
const API_BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}
```

**Mutating helpers** (all follow the same inline pattern — spec seam 3 is right that they collapse status into generic `Error`):
- `api.missions.updateStory` — lines 292–303 (PATCH `/missions/stories/:storyKey`)
- `api.missions.updateColumns` — lines 312–322 (PATCH `/missions/:epicKey/columns`)
- `api.missions.setMilestoneSummary` — lines 327–340 (PUT, ends without `res.json()` — 204)
- `api.launchpad.hideIssue` — lines 347–357; `api.devils.hideIssue` — lines 364–374 (identical PATCH pattern)

**`StoryDetailResponse` (client copy)** — **lines 191–203**, field-for-field identical to the server's interface (including `labels: string[]` at line 202). Add `copy: IssueCopyData` here too, plus `AdfNode`/`AdfDocument`/`IssueCopyData`/`InitializeTranslationKeysResponse` interfaces — keep in lockstep with `services/missions.ts`.

**Where to add `ApiError` and `initializeTranslationKeys`**:
- `ApiError` class: no error class exists today; add it near `fetchJson` (top of file, e.g. after line 10) and export it. Spec's shape: `class ApiError extends Error { constructor(message: string, public status: number, public body: unknown) { super(message); } }`. Decide deliberately whether `fetchJson` itself throws `ApiError` for **all** endpoints (simplest, one change site; existing callers only read `.message`, which still works) or only the new endpoint (requires a separate fetch path). The spec says "on `!res.ok` throw `ApiError` with the parsed body" in the `fetchJson` context — i.e. upgrade `fetchJson` and the mutating helpers, or at least the new POST helper.
- `initializeTranslationKeys`: add inside the `missions` namespace (lines 287–341), alongside `updateStory`. It is a **POST with no body** — follow the `updateStory` inline-fetch shape but `method: "POST"`, no `Content-Type`/body, and return `res.json()` typed as `InitializeTranslationKeysResponse`. Path: `/missions/issues/${encodeURIComponent(issueKey)}/copy/translation-keys/initialize`.

**Namespacing**: everything lives on the exported `api` singleton (line 252) with per-domain groups (`api.jira`, `api.github`, `api.missions`, `api.launchpad`, `api.devils`). New methods go under `api.missions`.

### 2b. `packages/client/src/components/statusUtils.tsx` (124 lines) — full current contents

- `STATUS_DISPLAY_NAMES` (lines 2–4) + `displayStatus(status)` (6–8): maps `"READY FOR DEVELOPMENT"` → `"RFD"`.
- `STATUS_COLORS` (10–29): Jira workflow status → Tailwind badge classes.
- `COPY_STATUS_COLORS` (31–37), exact:

```ts
// statusUtils.tsx:31-37
export const COPY_STATUS_COLORS: Record<string, string> = {
  "Copy - ready to start": "bg-sky-100 text-sky-700",
  "Copy - in progress": "bg-sky-100 text-sky-700",
  "Translation - ready to start": "bg-yellow-100 text-yellow-700",
  "Translation - in progress": "bg-yellow-100 text-yellow-700",
  "Translation - done": "bg-green-100 text-green-700",
};
```

- `statusBadge(status)` (39–42): `<span className={\`rounded-full px-2 py-0.5 text-xs font-medium ${cls}\`}>` with `cls = STATUS_COLORS[status] ?? "bg-red-100 text-red-700"` — **red** fallback (why spec seam 4 says don't reuse it for copy statuses).
- `STATUS_DOT_COLOR` (48–67), `STATUS_BG_TINT` (70–89), `FALLBACK_DOT`/`FALLBACK_BG` (91–92), `getStatusStyle` (94–99).
- `AGE_COLORS` (103–109), `ageInfo(latestActivity)` (111–123).

New `copyStatusBadge(status: string)` belongs here next to `statusBadge`, keyed to `COPY_STATUS_COLORS` with gray fallback (see 2e). Note `COPY_STATUS_COLORS` is already imported elsewhere (`MilestoneGroup.tsx:3`), so export is the norm.

### 2c. `packages/client/src/components/StoryDetailModal.tsx` (441 lines)

**Imports** — lines 1–8. `renderContent`/`renderAdfNode`/`AdfNode` are **module-local and NOT exported** (lines 17–37) — if `CopyTab` needs the ADF renderer, either export `renderContent`/`renderAdfNode`/`AdfNode` from this file or move them to a shared module (e.g. `adf.tsx`). The latter is cleaner but a bigger diff; exporting from `StoryDetailModal.tsx` is the minimal change.

**`AdfNode` interface** — lines 31–37:

```ts
// StoryDetailModal.tsx:31-37
interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}
```

**`renderAdfNode` — full current code, lines 39–111** (spec said `:56–110` for the switch — **DRIFT**: the switch statement actually spans lines 56–110 but the whole function including text-mark handling is 39–111):

```ts
// StoryDetailModal.tsx:39-111
function renderAdfNode(node: AdfNode): React.ReactNode {
  if (node.type === "text") {
    let element: React.ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "strong") element = <strong>{element}</strong>;
      else if (mark.type === "em") element = <em>{element}</em>;
      else if (mark.type === "code") element = <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{element}</code>;
      else if (mark.type === "link") element = <a href={String(mark.attrs?.href ?? "#")} className="text-blue-600 underline" target="_blank" rel="noreferrer">{element}</a>;
    }
    return element;
  }

  const renderedChildren = (node.content ?? []).map((child, i) => {
    const rendered = renderAdfNode(child);
    return <span key={i}>{rendered}</span>;
  });

  switch (node.type) {
    case "doc":
      return <>{renderedChildren}</>;
    case "paragraph":
      return <p className="mb-2">{renderedChildren}</p>;
    case "heading": {
      const level = (node.attrs?.level as number) ?? 3;
      if (level === 1) return <h1 className="mb-2 font-semibold">{renderedChildren}</h1>;
      if (level === 2) return <h2 className="mb-2 font-semibold">{renderedChildren}</h2>;
      if (level === 3) return <h3 className="mb-2 font-semibold">{renderedChildren}</h3>;
      if (level === 4) return <h4 className="mb-2 font-semibold">{renderedChildren}</h4>;
      if (level === 5) return <h5 className="mb-2 font-semibold">{renderedChildren}</h5>;
      return <h6 className="mb-2 font-semibold">{renderedChildren}</h6>;
    }
    case "bulletList":
      return <ul className="mb-2 list-disc pl-5">{renderedChildren}</ul>;
    case "orderedList":
      return <ol className="mb-2 list-decimal pl-5">{renderedChildren}</ol>;
    case "listItem":
      return (
        <li>
          {(node.content ?? []).map((child, i) =>
            child.type === "paragraph" ? (
              <span key={i}>
                {(child.content ?? []).map((c, j) => (
                  <span key={j}>{renderAdfNode(c)}</span>
                ))}
              </span>
            ) : (
              <span key={i}>{renderAdfNode(child)}</span>
            )
          )}
        </li>
      );
    case "codeBlock":
      return <pre className="mb-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs">{renderedChildren}</pre>;
    case "blockquote":
      return <blockquote className="mb-2 border-l-4 border-gray-300 pl-3 italic">{renderedChildren}</blockquote>;
    case "rule":
      return <hr className="my-3 border-gray-200" />;
    case "hardBreak":
      return <br />;
    case "inlineCard": {
      const url = String(node.attrs?.url ?? "#");
      const match = url.match(/\/browse\/([A-Z]+-\d+)/);
      const label = match ? match[1] : url;
      return <a href={url} className="text-blue-600 underline" target="_blank" rel="noreferrer">{label}</a>;
    }
    case "mediaSingle":
    case "media":
      return null;
    default:
      return <>{renderedChildren}</>;
  }
}
```

Confirmed: **no `table` / `tableRow` / `tableCell` / `tableHeader` cases exist**; the `default` case (lines 108–109) renders children flat, which would drop all table structure. Spec seam 5 is accurate. Caveats when adding table cases: the shared `renderedChildren` wraps each child in `<span key={i}>` (lines 51–54), which is invalid HTML inside `<table>`/`<tr>` — table cases should map children directly to real `<tr>`/`<td>`/`<th>` elements (e.g. `node.content!.map((row, i) => <tr key={i}>…`) rather than reusing `renderedChildren`. The prototype's table chrome (`CopyTabPrototype.tsx:30–50`): outer `overflow-x-auto rounded-lg border border-gray-200`, `<table className="w-full table-fixed border-collapse text-left text-sm">`, header `<thead className="bg-gray-50 text-xs font-semibold text-gray-600">`, cells `border-r border-gray-200 px-3 py-2 align-top last:border-r-0` (+ `border-b` on non-last rows), blank cell → `<span className="text-gray-300">&nbsp;</span>`. Note the prototype's column-0 `font-mono` styling is **rejected by the spec** ("Do not infer styling from column position").

**`activeTab` union** — **line 187** (spec said `:187` ✓, matches):

```ts
// StoryDetailModal.tsx:187
const [activeTab, setActiveTab] = useState<"subtasks" | "details" | "plan" | "github" | "wayfinder" | "comments">("subtasks");
```

**Tab row buttons** — the tabs block is lines 285–355 (`{detail && ( <div className="flex gap-1 border-b border-gray-200 px-6"> …`). Order: Subtasks/Stories (287–296), Details (297–306), conditional Implementation Plan (307–318, gated `detail.implementationPlan != null`), conditional GitHub (319–331, gated `detail.prState`), conditional Wayfinder (332–343, gated `detail.labels.includes("wayfinder:map")`), Comments (344–353). Exact Wayfinder + Comments JSX:

```tsx
// StoryDetailModal.tsx:332-353
            {detail.labels.includes("wayfinder:map") && (
              <button
                onClick={handleWayfinderTab}
                className={`border-b-2 px-3 py-2 text-xs font-medium transition ${
                  activeTab === "wayfinder"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Wayfinder
              </button>
            )}
            <button
              onClick={() => setActiveTab("comments")}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition ${
                activeTab === "comments"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Comments{comments !== null ? ` (${comments.length})` : commentsLoading ? " (…)" : ""}
            </button>
```

The Copy `<button>` goes between line 343 (`)}` closing the Wayfinder block) and line 344 (Comments `<button>`) — spec's `:343`/`:344` insertion points ✓ match exactly. Use the same className template.

**Lazy-fetch structure for GitHub/Wayfinder tabs**: handlers at lines 224–235 (`handleGithubTab`) and 237–248 (`handleWayfinderTab`) — set tab, then fetch-once-if-not-loaded via `api.missions.getStoryGithub` / `getStoryWayfinder` into dedicated state triples (`githubData/githubLoading/githubError` lines 188–190; `wayfinderData/wayfinderLoading/wayfinderError` lines 191–193). Tab content renders at lines 418–426 (GitHub) and 428–436 (Wayfinder): loading text → error text → `<GitHubPrTab data={githubData} />` / `<WayfinderTab tickets={wayfinderData.tickets} />`. **Per spec seam 6, Copy needs NO lazy fetch** — data arrives inline in `detail.copy`, and the tab content updates from the initialize response's authoritative `copy`. State reset on storyKey change: the `useEffect` at lines 198–222 resets all per-tab state and sets the initial tab (`data.subtasks.length > 0 ? "subtasks" : "details"`, line 211) — per spec, don't auto-select Copy; if you add copy-specific state to the modal (e.g. conflict notice), reset it in this effect.

**Modal content padding** — line 358: `<div className="flex-1 overflow-y-auto px-6 py-4">` is the shared content area (spec's "existing `px-6 py-4` content padding" ✓). The Details tab (lines 372–383) shows the `space-y-6` section rhythm and section heading style (`<h3 className="mb-2 text-sm font-semibold text-gray-700">`) that the Copy tab's two sections should mirror. Modal frame: lines 259–264 (`max-w-3xl`, `max-h-[85vh]`).

**How `StoryDetailResponse` flows in**: `const [detail, setDetail] = useState<StoryDetailResponse | null>(null)` (line 184), populated by `api.missions.getStoryDetail(storyKey)` in the effect at lines 207–214. `detail` is null until load completes; all tab rendering is gated on `detail &&`.

### 2d. Where `CopyTab` should live

Same folder, same pattern: `packages/client/src/components/CopyTab.tsx`, default export, props-only component like `GitHubPrTab` (`GitHubPrTab.tsx`, 188 lines, takes `data: StoryGitHubResponse`) and `WayfinderTab` (`WayfinderTab.tsx`, 36 lines, takes `tickets: WayfinderTicket[]`). CopyTab will need a bit more: the current `IssueCopyData`, the `issueKey` (to call initialize), and an `onCopyChange(copy: IssueCopyData)` (or similar) callback so the modal can store the authoritative post-action copy; plus internal saving/error state. Tab content in the modal follows the `{detail && activeTab === "copy" && <CopyTab … />}` pattern near lines 418–436.

### 2e. `MilestoneGroup.tsx` — the gray fallback badge

Spec cited `:108–112` — **DRIFT**: the copyStatus badge is actually at **lines 108–112** ✓ (verified; matches). Exact code:

```tsx
// MilestoneGroup.tsx:108-112
              {story.copyStatus && (
                <span className={`rounded px-1.5 py-0.5 text-xs ${COPY_STATUS_COLORS[story.copyStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {story.copyStatus}
                </span>
              )}
```

So the gray fallback is `bg-gray-100 text-gray-600` ✓ (spec seam 4 correct). Note this badge uses `rounded px-1.5 py-0.5 text-xs` while `statusBadge` uses `rounded-full px-2 py-0.5 text-xs font-medium` — the spec says `copyStatusBadge` should mirror `statusBadge`, so adopt the pill (`rounded-full …`) classes with the COPY map + gray fallback.

---

## 3. Test patterns

### 3a. Spying on the api singleton

`MissionPage.test.tsx:686–687` (spec said `:686` ✓):

```ts
vi.spyOn(api.missions, "getStoryDetail").mockReturnValue(new Promise(() => {}));
vi.spyOn(api.missions, "getStoryComments").mockReturnValue(new Promise(() => {}));
```

`MilestoneWorkspace.test.tsx:257` (spec said `:257` ✓):

```ts
vi.spyOn(api.missions, "updateStory").mockRejectedValue(new Error("Jira rejected the move"));
```

Other idioms in the same files: `.mockResolvedValue({ missions: summaries })` (`MissionPage.test.tsx:120`), `.mockImplementation(async (key) => mission(key))` (`:122`), `vi.mocked(api.missions.getDetail).mockReturnValueOnce(...)` chaining (`:223–225`, `:265–267`), `afterEach(() => vi.restoreAllMocks())` (`MissionPage.test.tsx:125`, `MilestoneWorkspace.test.tsx:86`). For a never-resolving pending promise (to assert the disabled `Creating table…` state): `mockReturnValue(new Promise(() => {}))` or the local `deferred<T>()` helper (defined inline in both files — `MissionPage.test.tsx:59–67`, `MilestoneWorkspace.test.tsx:14–22`; copy it into the new test file).

### 3b. Fixtures and setup

- Fixture builder: `packages/client/src/test/fixtures.ts` exports only `makeStory(overrides)` → `MissionStory` (lines 3–21). **No `StoryDetailResponse` fixture exists** — spec line 172 is correct; build detail objects inline. A `StoryDetailResponse` fixture will need every field from `client.ts:191–203` plus the new `copy` field.
- Imports: `import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";` and `import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";`. `@testing-library/user-event` is **not** a dependency (see `packages/client/package.json`) — use `fireEvent`.
- Setup file: `packages/client/src/test/setup.ts` is one line: `import "@testing-library/jest-dom/vitest";` → jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`, `toHaveTextContent`…) are available globally.
- Rendering `StoryDetailModal` directly: it takes `{ storyKey, hideDone, onClose, closeOnEscape? }` (`StoryDetailModal.tsx:10–15,183`) and calls two endpoints on mount (`getStoryDetail` + `getStoryComments`, lines 207–221) — a test must spy on BOTH or the unspied call hits `fetch`. Async waiting: `await screen.findByText(...)`, `await waitFor(() => expect(...))`, `await act(async () => deferred.resolve(...))`. `MissionPage.test.tsx:685–701` shows opening the modal via pointerDown/pointerUp on a story row and asserting the `"Loading…"` heading; rendering the modal standalone is simpler and matches how `MilestoneWorkspace.test.tsx` renders components directly (no router needed — the modal itself uses no router hooks; its child `JiraLink` does not either — it just renders an `<a>`; verify at test time).

### 3c. Vitest config and running tests

`packages/client/vite.config.ts:12–16`:

```ts
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
    },
```

Run from repo root: `pnpm --filter @devman/client test` (all), `pnpm --filter @devman/client test:watch`, single file `pnpm --filter @devman/client exec vitest run src/components/CopyTab.test.tsx`, single test `... -t "shows the badge"`. (Per CLAUDE.md; no lint script is wired up.)

### 3d. Does a StoryDetailModal test exist?

**No.** `ls packages/client/src/components/` shows test files: `MilestoneWorkspace.test.tsx`, `MissionPage.test.tsx`, `StoryMapGrid.test.tsx`, `epicProgress.test.ts`, `milestoneProjection.test.ts`, `missionShortcuts.test.ts`, `parsePrField.test.ts`, `statusUtils.test.ts`, `storyFiltering.test.ts`, `wayfinderBadges.test.ts`, `wayfinderUtils.test.ts`, `workspaceMoveState.test.ts`. Create `StoryDetailModal.test.tsx` (or `CopyTab.test.tsx`) fresh; spec line 162 allows either.

---

## 4. Eligibility gating

**Current conditional-tab mechanism**: purely client-side, reading fields off the already-fetched `detail` (`StoryDetailResponse`):
- Implementation Plan tab: `detail.implementationPlan != null` (`StoryDetailModal.tsx:307`).
- GitHub tab: `detail.prState` truthy (`:319`).
- Wayfinder tab: `detail.labels.includes("wayfinder:map")` (`:332`) — **this is the direct precedent for label-based gating**.

**What `StoryDetailResponse` contains today**: `labels: string[]` is **already present and populated** on both sides (server interface `missions.ts:98`, populated `:497`; client `client.ts:202`). So label gating (`labels.includes("copy") || labels.includes("copy-clinical")`) needs **no server change**.

**What it does NOT contain**: the Jira project key. `getStoryDetail`'s fields array (`missions.ts:423`) does not request `"project"`, and the response has no project field. The detail endpoint is currently only used for EBBACKLOG issues in practice (all call sites — `MissionPage.tsx:448`, `LaunchpadPage.tsx:377`, `SupportPage.tsx:184` — open issues from EBBACKLOG lists; SupportPage's modal opens SUPPORT tickets' linked EBBACKLOG issues… actually `SupportPage` opens whatever key is selected, so a non-EBBACKLOG key is possible in principle). Two options: (a) gate on `key.startsWith("EBBACKLOG-")` client-side, or (b) add `project: string` to `StoryDetailResponse` (request `"project"` in the fields array, read `(fields.project as { key?: string } | null)?.key`). Either is fine client-side because — per spec — **the server independently enforces** eligibility on the initialize endpoint (project + label check, 422). The cleanest is to include eligibility in the new `copy` payload itself (e.g. gate the tab on `detail.copy` presence/labels), but the spec's `IssueCopyData` shape (`status`, `translationKeys`, `translationKeysState`) has no `eligible` flag — so implementers must derive it client-side from `detail.labels` + key prefix (or add `project`). This is a small decision the spec leaves implicit; prefer deriving from `detail.labels` plus `detail.key.startsWith("EBBACKLOG-")` and keep server enforcement as the integrity boundary.

Also note: `customfield_11302` is currently only read in `fetchStories` (list view, `missions.ts:268`), NOT in the detail fetch — the detail fetch's fields array (line 423) must gain both `"customfield_11302"` and `"customfield_11285"`.

---

## 5. Spec "Code seams" verification (spec.md lines 129–143)

| # | Spec claim | Verdict |
|---|---|---|
| 1 | `StoryDetailResponse` interface at `services/missions.ts:87–99` | ✓ exact |
| 1 | populate object literal at `:486–498` | ✓ exact |
| 1 | `fields` array at `:423` | ✓ exact (add the two custom fields here) |
| 1 | `/issues/` prefix new on missionsRouter, no collision with `/stories/:storyKey` | ✓ verified — no `/issues/*` routes exist |
| 1 | reuse private `getClient()` in `services/missions.ts` | ✓ exists at lines 7–25 |
| 2 | read via `searchForIssuesUsingJqlEnhancedSearch` | ✓ used everywhere; old `searchForIssuesUsingJql` still present in jira.js 4.1.3 types but Jira returns 410 — avoid |
| 2 | `customfield_11302` as `{ value }` precedent at `missions.ts:268` | ✓ exact |
| 2 | `editIssue` precedent at `missions.ts:410–414` | ✓ exact; second precedent `launchpad.ts:68–75` (spec says `68–75` ✓) |
| 3 | `fetchJson`/mutating helpers collapse errors | ✓ verified (`client.ts:3–10`, `292–303`, `312–322`, `327–340`, `347–357`, `364–374`) |
| 4 | `statusBadge` keyed to `STATUS_COLORS`, red fallback; `COPY_STATUS_COLORS` exists but unused by `statusBadge` | ✓ exact (`statusUtils.tsx:39–42`, `:31–37`) |
| 4 | gray fallback `bg-gray-100 text-gray-600` at `MilestoneGroup.tsx:108–112` | ✓ exact |
| 5 | `renderAdfNode` at `StoryDetailModal.tsx:56–110`, no table cases | △ minor drift: the **switch** is `:56–110` but the function (incl. text-mark handling) is **`:39–111`**; no table cases ✓ confirmed; also note the shared `renderedChildren` `<span key>` wrapper (lines 51–54) is invalid inside `<table>` — table cases must build rows/cells directly |
| 6 | `activeTab` union at `StoryDetailModal.tsx:187` | ✓ exact |
| 6 | insert Copy button between Wayfinder close `:343` and Comments `:344` | ✓ exact |
| 6 | `GitHubPrTab`/`WayfinderTab` component precedent | ✓ both in `packages/client/src/components/`, default-exported, props-only |

**Facts with no spec citation, verified anyway**: story-detail not-found currently throws generic Error → 500 (missions.ts:426–427 + routes/missions.ts:117–127); only 404-status detection precedent is `missions.ts:315–318` (`err?.status === 404 || err?.statusCode === 404`, jira.js `HttpException.status`); `getIssue` exists on the client but spec mandates search-based reads; jira.js version 4.1.3; no `userEvent` dependency (use `fireEvent`); no `StoryDetailResponse` fixture (`makeStory` only); no existing `StoryDetailModal`/`CopyTab` test file.

## 6. Implementation checklist distilled (do not redesign — spec is authoritative)

Server:
1. `services/missions.ts`: add `AdfNode`/`AdfDocument`/`IssueCopyData`/`InitializeTranslationKeysResponse` types near line 99; add the two fields to the array at line 423; add `copy:` to the literal at 486–498; add `initializeTranslationKeys(issueKey)` service fn using module `getClient()` (search-read labels+project+`customfield_11285` → 404/422 checks → empty-check → `editIssue` write of the canonical template from `research/reference-table-and-field-schema.md` lines 27–226 → re-read → 502-if-still-empty → typed outcome).
2. `routes/missions.ts`: register `POST /issues/:issueKey/copy/translation-keys/initialize` after line 140, mapping typed outcomes to 200/404/409/422/502 instead of the blanket 500.

Client:
3. `api/client.ts`: `ApiError` class + throw it on `!res.ok`; `IssueCopyData` etc. duplicated in lockstep; `api.missions.initializeTranslationKeys(issueKey)`.
4. `statusUtils.tsx`: `copyStatusBadge(status)` mirroring `statusBadge` (lines 39–42) but keyed to `COPY_STATUS_COLORS`, gray fallback `bg-gray-100 text-gray-600`; extend `statusUtils.test.ts` (patterns in §3).
5. `StoryDetailModal.tsx`: add table/tableRow/tableHeader/tableCell cases to `renderAdfNode` (39–111); export or share the renderer for CopyTab; extend `activeTab` union (line 187) with `"copy"`; insert gated Copy `<button>` between lines 343/344; add `{detail && activeTab === "copy" && <CopyTab … />}` content block near lines 418–436.
6. New `components/CopyTab.tsx` (variant-A field sections; prototype at `prototypes/CopyTabPrototype.tsx:82–100`, 30–50, 52–66, 68–75) + new test file per spec's coverage list (spec.md lines 162–172).
