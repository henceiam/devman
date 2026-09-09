# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

DevMan is a local project tracker that aggregates data from Jira Cloud and GitHub to give visibility into project progress, backlogs, pull requests, and developer activity for the "Radicals" and "Devils" teams on the `EBBACKLOG` Jira project.

## Commands

```bash
# Install dependencies (run from repo root)
pnpm install

# Start both server and client in parallel
pnpm dev

# Or start individually
pnpm dev:server   # Express server on port 3001 (tsx watch)
pnpm dev:client   # Vite dev server on port 5173

# Build everything (tsc for server, tsc -b && vite build for client)
pnpm build

# Client tests (vitest) — run from packages/client
pnpm --filter @devman/client test          # run once
pnpm --filter @devman/client test:watch    # watch mode
pnpm --filter @devman/client exec vitest run src/components/statusUtils.test.ts   # single file
pnpm --filter @devman/client exec vitest run -t "returns short name"              # single test by name

# Server tests (vitest)
pnpm --filter @devman/server test
```

No lint script is wired up in either package despite the root `pnpm lint` script existing.

The client dev server proxies `/api` requests to the server (see `packages/client/vite.config.ts`), so during development always open `http://localhost:5173`, not the server port directly.

Env vars live in a single root-level `.env` (loaded by both packages — see `packages/server/src/config.ts` and `envDir` in `vite.config.ts`). See `.env.example` for the full list. Only vars prefixed `VITE_` are exposed to the browser bundle.

## Architecture

Monorepo with two pnpm workspace packages: `@devman/server` (Express 5 + TypeScript) and `@devman/client` (React 19 + Vite + Tailwind 4 + react-router 7).

### Server (`packages/server/src/`)

- `index.ts` — Express app entry; mounts routers under `/api/*`.
- `config.ts` — loads `.env` from the repo root; all env access should go through this module.
- `routes/` — thin Express routers that parse request params/body and delegate to `services/`. All handlers wrap logic in try/catch and return `{ error: message }` with a 500 on failure — follow this pattern for new endpoints.
- `services/` — the actual Jira/GitHub API integration and domain logic:
  - `jira.ts` — low-level Jira client wrapper (via `jira.js`), diagnostics, generic issue search.
  - `github.ts` — Octokit wrapper; PR listing, review/reviewer enrichment.
  - `launchpad.ts` — escalated-ticket and in-progress-ticket queries for the Launchpad/Devils pages, parameterized by team name (`Radicals` / `Devils`).
  - `missions.ts` — the largest service; Mission (Epic) detail, story map columns, story detail/comments, GitHub cross-referencing per story, and milestone/category updates.

**Route ordering matters**: in `missions.ts` routes, specific subroutes like `/stories/:storyKey/github` must be registered before the generic `/stories/:storyKey` route, or Express treats the suffix as part of the `:storyKey` param.

**Launchpad/Devils duality**: `routes/launchpad.ts` builds one router factory (`createTeamRouter`) mounted twice — as `launchpadRouter` (team "Radicals", mounted at `/api/launchpad`) and `devilsRouter` (team "Devils", mounted at `/api/devils`). The client's `LaunchpadPage` component takes a `teamName`/`apiNamespace` prop pair to render against either one (see `App.tsx`).

### Client (`packages/client/src/`)

- `App.tsx` — top-level layout, nav, and `react-router` route table. Routes: `/` (Dashboard: Jira + GitHub panels side by side), `/missions/:missionKey?`, `/support`, `/launchpad`, `/devils`, `/diagnostics`, `/pull-requests` (nested layout with an index "open" page and `/recently-closed`).
- `api/client.ts` — single typed fetch wrapper (`api.*` methods) covering every server endpoint; response/request types here must stay in sync with the server's route/service return shapes. All requests go through relative `/api/...` paths (Vite dev proxy handles the rest).
- `components/` — one file per page or panel; `statusUtils.tsx` centralizes Jira status → color/label mapping and is unit-tested (`*.test.ts` files sit next to the code they cover, run via vitest/jsdom).

### Domain knowledge (Jira custom fields — read before touching Jira data)

This is undocumented tribal knowledge that isn't discoverable from Jira's UI. The full reference lives in [.github/instructions/domain-logic.instructions.md](.github/instructions/domain-logic.instructions.md) — consult it before changing anything that reads or writes these fields. Key points:

- Custom field IDs (`customfield_10000` = embedded PR/dev-info JSON, `customfield_11302` = Copy/Translation Status, `customfield_11357` = T-shirt size, `customfield_11465` = Hidden Date, `customfield_11477` = Milestone, `customfield_11487` = Category/Mapping config) only apply to the `EBBACKLOG` project. Other projects use standard fields only.
- **PR state parsing** from `customfield_10000` follows a strict priority order (PR stateCount → fallback pullrequest= → branch= → null) — see the doc for the exact algorithm. When the GitHub API call fails (e.g. private repo), fall back to building a `PrDetail` from the Jira dev-status data rather than returning null.
- **Jira search**: always use `searchForIssuesUsingJqlEnhancedSearch` — the older `searchForIssuesUsingJql` returns HTTP 410 Gone.
- **GitHub reviewers**: use `listRequestedReviewers` — `listReviewRequests` does not exist on the Octokit client.
- Product team filtering uses checkbox JQL syntax: `"Product teams[Checkboxes]" in (Radicals)`, not `=`.
- The escalation label is `issue-escalated-succesfully` — note the intentional typo, must be preserved exactly in JQL.

### Other notes

- `.sisyphus/` and `.opencode/` are local tooling/config directories for other agent workflows used by the maintainer, not part of the app itself.
- Prefer typed responses over `any`; keep `api/client.ts` types in lockstep with server response shapes when changing either side.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
