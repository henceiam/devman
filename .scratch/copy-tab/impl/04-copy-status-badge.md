# Impl T4 — copyStatusBadge helper + tests

Type: implementation
Status: ready-for-agent
Blocked by:

## Scope

`packages/client/src/components/statusUtils.tsx` + `statusUtils.test.ts`. Implements spec seam 4.

Authoritative context:
- Spec: `.scratch/copy-tab/spec.md` seam 4.
- Codebase facts: `.scratch/copy-tab/exploration/codebase-context.md` §2b (full current file contents) and §2e (gray fallback reference at MilestoneGroup.tsx:108–112).

## Work

1. Add `copyStatusBadge(status: string)` to `statusUtils.tsx`, mirroring `statusBadge` (pill classes `rounded-full px-2 py-0.5 text-xs font-medium`) but keyed to `COPY_STATUS_COLORS` with fallback `bg-gray-100 text-gray-600`. Export it.
2. Extend `statusUtils.test.ts` following its existing patterns: a known copy status (e.g. `"Copy - ready to start"` → sky classes) and an unknown value (→ gray fallback classes).

## Verification

- `pnpm --filter @devman/client exec vitest run src/components/statusUtils.test.ts` passes.
- `pnpm build` typechecks.

## Completion

Report the commit hash.
