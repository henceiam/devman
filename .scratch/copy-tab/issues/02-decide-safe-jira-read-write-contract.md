# Decide the safe Jira read/write contract

Type: grilling
Status: resolved
Blocked by: 01

## Question

Given the verified Jira field schemas and reference table, what typed server and client contract should fetch Copy-tab data and initialize Translation keys atomically enough to reject a stale empty-state write rather than overwrite concurrent content?

## Answer

Use a server-owned, best-effort conditional initialization contract. Jira has no compare-and-set primitive for this field, so DevMan cannot guarantee protection from an external writer that updates Jira in the narrow interval between DevMan's final read and PUT. The implementation and UI must not describe this as fully atomic.

### Eligibility

A Copy-eligible issue:

- belongs to project `EBBACKLOG`;
- has any issue type, including Epic, Story, Task, Bug, or Subtask; and
- carries the exact, case-sensitive label `copy` or `copy-clinical`.

The server independently enforces project and label eligibility. The client hiding the tab or action is not a data-integrity boundary.

### Read contract

Add Copy data to the existing issue-detail response so labels and both Copy fields are fetched in the same Jira query. Keep the existing `/missions/stories/:storyKey` route unchanged in this effort, but use issue-neutral names for all new contract types:

```ts
interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  [key: string]: unknown;
}

interface AdfDocument extends AdfNode {
  type: "doc";
  version: 1;
  content: AdfNode[];
}

interface IssueCopyData {
  status: string | null;
  translationKeys: AdfDocument | null;
  translationKeysState: "empty" | "initialized";
}
```

The server validates only the ADF invariants DevMan relies on: a `doc` root, version `1`, and array `content`. It preserves all recognized and unrecognized nodes, marks, and attributes unchanged. The server computes `translationKeysState` using the map's agreed empty-content rule; the client does not independently decide whether initialization is legal.

The existing detail response gains `copy: IssueCopyData`. `status` is `customfield_11302.value`, or `null`. `translationKeys` is the valid Jira ADF document, or `null` when missing, null, structurally contentless, or malformed. A table is `initialized` even when all its cells are blank.

### Initialization command

Use an issue-neutral command endpoint:

```http
POST /api/missions/issues/:issueKey/copy/translation-keys/initialize
```

The request has no body. In particular, the browser sends neither the reference ADF nor an assertion that the current field is empty. The server owns the canonical EBBACKLOG-25185-derived template.

For each request, the server:

1. Fetches the issue's project, labels, and current `customfield_11285` value from Jira.
2. Rejects an issue outside `EBBACKLOG` or without an exact eligible label.
3. Returns a conflict without writing if Translation keys is initialized.
4. Writes the canonical ADF template if it is still empty.
5. Re-reads the Copy fields and returns Jira's authoritative stored value.
6. Treats an unexpectedly empty post-write value as an upstream failure, never as success.

Do not add an application lock: it would serialize DevMan requests but could not include Jira UI or other external writers, so its complexity would not establish the promised safety property. The immediate server-side re-read before PUT narrows but does not eliminate Jira's time-of-check/time-of-use race.

### Typed outcomes

```ts
type InitializeTranslationKeysResponse =
  | {
      outcome: "initialized";
      copy: IssueCopyData;
    }
  | {
      outcome: "already-initialized";
      copy: IssueCopyData;
    };
```

- `200` with `outcome: "initialized"`: Jira stored a non-empty value; `copy` is from the post-write re-read.
- `409` with `outcome: "already-initialized"`: the final pre-write read found content; no write occurred and `copy` contains the authoritative current value.
- `404`: the Jira issue does not exist.
- `422`: the issue exists but is outside `EBBACKLOG` or lacks both eligible labels.
- `500` or `502`: an unexpected DevMan or Jira failure, including a write followed by an unexpectedly empty read.

The client API layer must preserve and type the `409` body rather than collapsing it into a generic `Error`, allowing the UI to replace its stale empty state immediately. While the request is pending, the client disables the action. A `200` or typed `409` replaces local Copy data with the response's authoritative `copy`; other failures leave the action available and surface the presentation ticket's inline error state.
