# DevMan

Project tracker — Jira & GitHub.

## Prerequisites

- Node.js (>= 18)
- pnpm

## Setup

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env
```

Required `.env` values:

| Variable | Description |
|---|---|
| `JIRA_HOST` | Your Jira Cloud instance URL |
| `JIRA_EMAIL` | Jira account email |
| `JIRA_API_TOKEN` | Jira API token |
| `GITHUB_TOKEN` | GitHub personal access token |
| `VITE_JIRA_HOST` | Same as `JIRA_HOST` (exposed to browser) |

## Dev

```bash
# Start both server and client in parallel
pnpm dev

# Or start individually
pnpm dev:server   # Express server on port 3001
pnpm dev:client   # Vite dev server on port 5173
```

The client proxies `/api` requests to the server, so open `http://localhost:5173`.

## Build

```bash
pnpm build
```
