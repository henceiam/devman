# Bulk-fetch feasibility: subtask `labels` + `issuelinks` for Wayfinder

## Recommendation

Add `"issuelinks"` to the existing subtask `fields` array in
`getStoryDetail()` (`packages/server/src/services/missions.ts:441`) — the
same single bulk `searchForIssuesUsingJqlEnhancedSearch` call that already
fetches all other subtask fields. **No second query and no per-subtask REST
calls are needed.**

Two things fall out of the investigation that change the shape of the work:

- **`labels` is already being fetched and mapped** for subtasks today
  (`missions.ts:441` requests it, `missions.ts:458` maps it onto
  `SubtaskItem.labels`, and `SubtaskItem` already declares `labels: string[]`
  at `missions.ts:75`). There is nothing left to do for part of the ask —
  only `issuelinks` is new.
- Adding `issuelinks` to that same `fields: [...]` array is safe: `fields` is
  typed as plain `string[]` with no allow-list (jira.js
  `SearchForIssuesUsingJqlEnhancedSearch.fields?: string[]`,
  `node_modules/.pnpm/jira.js@4.1.3/node_modules/jira.js/out/version3/parameters/searchForIssuesUsingJqlEnhancedSearch.d.ts:52`),
  and this repo already proves combining `issuelinks` with several other
  fields in one bulk call works in production, in
  `packages/server/src/services/launchpad.ts:83-87` (`getLaunchpadEscalated`
  requests `["summary","status","priority","assignee","created","updated","issuelinks","customfield_10000"]`
  in a single call).

Parse the new `issuelinks` per subtask the same way `launchpad.ts:100-120`
already parses it for SUPPORT cross-references: iterate the array, pick
`link.inwardIssue ?? link.outwardIssue`, and use `link.type.name` /
`type.inward` / `type.outward` to classify the relationship. For Wayfinder,
filter to `inwardIssue`/`outwardIssue` keys that are also in the Story's own
`subtaskKeys` set (computed at `missions.ts:434`) so only intra-story
blocking edges are surfaced, and treat the link direction as:
`outwardIssue` present + `type.outward === "blocks"` → this subtask blocks
that one; `inwardIssue` present + `type.inward === "is blocked by"` → this
subtask is blocked by that one.

**Caveat carried into implementation:** don't hardcode `"Blocks"` /
`"is blocked by"` / `"blocks"` as magic strings without a fallback — these
are Jira's out-of-the-box defaults but are admin-editable per instance (see
Q2). Verify the actual strings on the DevMan Jira instance via
`GET /rest/api/3/issueLinkType` (or `mcp__7d2805d4...__getIssueLinkTypes` in
this environment) before shipping, and prefer matching on link `type.id`
if the Jira instance's admin has ever touched link type names, or otherwise
treat whatever `type.outward`/`type.inward` string comes back as data, not
an assumed constant.

---

## Q1: Does `fields` accept `issuelinks` and `labels` alongside existing subtask fields?

Yes — confirmed from the actual jira.js type definitions, not memory.

- `jira.js` version in this repo: `4.1.3`, vendored at
  `/Users/henricjohansson/DevMan/node_modules/.pnpm/jira.js@4.1.3/node_modules/jira.js`
  (not present in root `node_modules` as a plain dir — pnpm hoists it into
  `.pnpm/jira.js@4.1.3/node_modules/jira.js`; `packages/server` resolves it
  through the workspace).
- Method signature: `IssueSearch.searchForIssuesUsingJqlEnhancedSearch<T = Models.SearchAndReconcileResults>(parameters: Parameters.SearchForIssuesUsingJqlEnhancedSearch, ...)` —
  `out/version3/issueSearch.d.ts` (class `IssueSearch`).
- Parameter type: `fields?: string[]` — a plain array of field-name strings,
  no enum/union restricting which names are valid, no special-casing for
  `issuelinks`/`labels`.
  `out/version3/parameters/searchForIssuesUsingJqlEnhancedSearch.d.ts:52`
  (doc comment right above it, lines 29-51, describes it as "A list of
  fields to return for each issue... Any issue field").
- The response model's per-issue `fields` object types both fields
  natively: `issuelinks: IssueLink[]` at
  `out/version3/models/fields.d.ts:51` and `labels: string[]` at
  `out/version3/models/fields.d.ts:59` — i.e. jira.js's own generated types
  expect these to come back from a fields-scoped search, not just a full
  `GET /issue/{key}`.

Current subtask fetch in this repo, `packages/server/src/services/missions.ts`:

- `getStoryDetail()`, subtask branch, `missions.ts:436-442`:
  ```
  const subtaskResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
    jql: `key IN (${keysJql}) ORDER BY rank ASC`,
    maxResults: subtaskKeys.length,
    fields: ["summary", "status", "assignee", "customfield_10000", "updated", "labels"],
  });
  ```
  `labels` is already in this list, and `missions.ts:458` already maps it:
  `labels: (stFields.labels as string[] | null) ?? []`. `SubtaskItem`
  already declares `labels: string[]` (`missions.ts:66-76`). So the only
  actual gap is adding `"issuelinks"` to this same array.
- Same pattern one level up, for Story-level fields (not subtasks):
  `missions.ts:401` (`getStoryDetail`'s initial single-issue fetch) and
  `missions.ts:204` (`fetchStories`) both already request `"labels"`
  alongside unrelated fields (`summary`, `status`, `assignee`, `issuetype`,
  custom fields) in one call — further in-repo proof multi-field bulk
  fetches with `labels` work fine.

## Q2: Real shape of `issuelinks`, and does Jira's default "Blocks" type match `name`/`inward`/`outward` assumptions?

**Shape** — confirmed against both this repo's existing parsing code and
jira.js's generated models (which are code-generated from Atlassian's own
OpenAPI spec):

- First-party usage in this repo,
  `packages/server/src/services/launchpad.ts:100-120`
  (`getLaunchpadEscalated`): treats each `issuelinks` entry as
  `{ type: { name: string }, inwardIssue?: {...}, outwardIssue?: {...} }`,
  picks `link.inwardIssue ?? link.outwardIssue` to get "the other side" of
  the link, and reads `.fields.summary` / `.fields.status.name` /
  `.fields.status.statusCategory.key` / `.fields.priority.name` off the
  linked issue stub.
- jira.js model, `out/version3/models/issueLink.d.ts`:
  ```
  export interface IssueLink {
    id?: string;
    self?: string;
    type?: IssueLinkType;
    inwardIssue?: LinkedIssue;
    outwardIssue?: LinkedIssue;
  }
  ```
- jira.js model, `out/version3/models/issueLinkType.d.ts` — `IssueLinkType`
  has `id?`, `name?`, `inward?`, `outward?`, `self?` (doc comments confirm
  `name` is "the type of issue link" and `inward`/`outward` are "the
  description of the issue link type inward/outward link").
- jira.js model, `out/version3/models/linkedIssue.d.ts` — `LinkedIssue` has
  `id?`, `key?`, `self?`, `fields?: Fields` (a full nested `Fields` object,
  which is how `launchpad.ts` reads `.fields.summary` etc. off it).

This matches the ticket's assumption exactly: `type.name`/`type.inward`/
`type.outward`, `inwardIssue`/`outwardIssue`.

**Does Jira's default "Blocks" type literally read `name: "Blocks"`,
`inward: "is blocked by"`, `outward: "blocks"`?** Partially confirmed, with
an explicit caveat:

- Atlassian's own support documentation
  (`https://support.atlassian.com/jira-cloud-administration/docs/configure-issue-linking/`)
  explicitly names "the default 'Blocks' link type, where the name and
  outward description are 'blocks'" — confirming `name: "Blocks"` and
  `outward: "blocks"` as the shipped default.
- The same doc confirms link types (including defaults) are **admin-editable**:
  "you can edit the Name, Outward description, and Inward description of an
  existing work item link" — so a given Jira Cloud site's actual strings are
  not contractually fixed, only defaulted.
- I could not get a clean fetch of Atlassian's REST API v3 reference pages
  for `GET /rest/api/3/issueLinkType` in this session (the developer.atlassian.com
  docs pages are large SPA-rendered references and the fetch tool returned
  them truncated before reaching the schema/example section, both for the
  issue-links group and the issue-link-types group). The commonly-documented
  inward value for "Blocks" is `"is blocked by"`, consistent with the
  outward value Atlassian's support doc did confirm, but **this specific
  inward string was not independently verified against primary Atlassian
  docs in this session** — treat it as likely-correct, not certain.
- **Action for implementation**: verify the real strings on the DevMan Jira
  Cloud instance directly, e.g. `GET /rest/api/3/issueLinkType` (or the
  `getIssueLinkTypes` Atlassian MCP tool available in this environment) —
  per the ticket's own suggestion — before matching on `type.name`/`inward`/
  `outward` string literals. Prefer keying off `type.id` if the instance's
  admin has ever renamed link types, since `id` is stable and `name`/
  `inward`/`outward` are the editable parts per the support doc above.

## Q3: Fallback if bulk-fetch weren't possible

Not needed — Q1 and Q2 show it already works in one bulk call, and this
repo already does it for `issuelinks` (`launchpad.ts:83-87`) and for
`labels` (`missions.ts:441`) independently. There is no documented
restriction in jira.js's types or in either field's model definition that
would force splitting the request.

If a real restriction were ever hit (e.g. a future jira.js field-name
allow-list, or a Jira instance-side cap on fields-per-request), the cheapest
fallback — in that order of preference — would be:

1. A second bulk `searchForIssuesUsingJqlEnhancedSearch` call scoped to
   `key IN (<same subtaskKeys>)` requesting only `["issuelinks", "labels"]`,
   merged into the already-fetched `SubtaskItem[]` by key. This reuses the
   `subtaskKeys` array already computed at `missions.ts:434` and stays at
   O(1) additional Jira round-trips per Story, regardless of subtask count.
2. Never fall back to N+1 per-subtask `GET /rest/api/3/issue/{key}` calls —
   that scales with subtask count instead of Story count, and this codebase
   has no existing precedent for doing per-subtask REST calls (both
   `launchpad.ts` and `missions.ts` consistently favor one JQL-scoped bulk
   call over per-issue fetches).
