# DevMan — Project Instructions

## Overview
DevMan is a local project tracker that aggregates data from Jira Cloud and GitHub to provide visibility into project progress, backlogs, pull requests, and developer activity.

## Tech Stack
- **Monorepo**: pnpm workspaces
- **Backend**: Express 5, TypeScript, `jira.js`, `@octokit/rest`
- **Frontend**: React 19, Vite, Tailwind CSS 4
- **Config**: `.env` at project root (never hardcode credentials or ports)

## Conventions
- All environment config via `.env` — reference through `packages/server/src/config.ts`
- API routes live under `packages/server/src/routes/`
- Service wrappers (Jira, GitHub) live under `packages/server/src/services/`
- Frontend API client is at `packages/client/src/api/client.ts` — keep types in sync with backend responses
- Prefer typed responses over `any`
- Keep components focused — one panel per data source

## Project Structure
```
packages/server/src/
  config.ts          — env var loader
  index.ts           — Express app entry
  routes/            — Express routers (jira.ts, github.ts)
  services/          — API client wrappers (jira.ts, github.ts)

packages/client/src/
  App.tsx             — Main layout
  api/client.ts       — Typed fetch wrapper
  components/         — UI panels (JiraPanel, GitHubPanel)
```
