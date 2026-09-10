# Impl T2 — Client API layer: ApiError + initializeTranslationKeys

Type: implementation
Status: completed
Blocked by:

## Scope

`packages/client/src/api/client.ts` only. Implements spec seam 3.

Authoritative context:
- Spec: `.scratch/copy-tab/spec.md` — "Typed outcomes", seam 3.
- Codebase facts: `.scratch/copy-tab/exploration/codebase-context.md` §2a and §6 item 3.

## Work

1. Add and export `class ApiError extends Error { constructor(message: string, public status: number, public body: unknown) { super(message); } }` near `fetchJson` (top of file).
2. Upgrade `fetchJson` (and the inline mutating helpers if they parse error bodies the same way — keep the change minimal and consistent) to throw `ApiError` with the parsed body on `!res.ok`. Existing callers only read `.message`, so behavior must stay compatible (`body.error || \`API error: ${res.status}\`` as the message).
3. Duplicate the new types by hand, in lockstep with the server: `AdfNode`, `AdfDocument`, `IssueCopyData`, `InitializeTranslationKeysResponse` (spec.md lines 32–52, 81–84). Export them.
4. Add `copy: IssueCopyData;` to the client `StoryDetailResponse` (lines 191–203).
5. Add `api.missions.initializeTranslationKeys(issueKey): Promise<InitializeTranslationKeysResponse>` — POST to `/missions/issues/${encodeURIComponent(issueKey)}/copy/translation-keys/initialize`, no body, throwing `ApiError` on `!res.ok` (including 409), returning `res.json()` otherwise.

## Verification

- `pnpm --filter @devman/client test` passes.
- `pnpm build` typechecks.

## Notes

This ticket duplicates the types the server ticket (T1) defines; it does NOT depend on T1's code. Do not touch `StoryDetailModal.tsx` or any component in this ticket.

## Completion

Commit: aceb9a9

- `pnpm --filter @devman/client test` — 117/117 passing (12 files).
- `pnpm build` — typechecks cleanly (client + server).
