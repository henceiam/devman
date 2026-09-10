# Finalize the implementation-ready specification

Type: grilling
Status: resolved
Blocked by: 02, 03

## Question

How should the resolved Jira contract and Copy-tab presentation be assembled into an implementation-ready specification with explicit code seams, acceptance criteria, and automated-test coverage, leaving no design decisions for implementation?

## Answer

Assembled the three resolved decisions into an implementation-ready specification at [`../spec.md`](../spec.md). Settled the open seams (extend `missions.ts` rather than a new service; add a status-carrying `ApiError` to `api/client.ts`; add a `copyStatusBadge` helper to `statusUtils.tsx`; add the missing ADF `table`/`tableRow`/`tableHeader`/`tableCell` cases to `renderAdfNode`; wire the tab inline from the detail response with no lazy fetch) and fixed automated coverage as client unit tests with the server endpoint verified manually.
