# Establish the reference table and Jira field schema

Type: research
Status: resolved
Blocked by:

## Question

What are the exact Jira REST representations and schemas of Copy & Translations (`customfield_11302`) and Translation keys (`customfield_11285`) on EBBACKLOG-25185, including the complete ADF table value that must be reproduced when initializing an empty Translation keys field?

## Answer

`customfield_11302` is the single-select field `Copy & Translations` (`type: option`); EBBACKLOG-25185 currently returns option `id: 11352`, `value: Copy - ready to start`. `customfield_11285` is the textarea field `Translation keys` (`type: string` in field metadata but represented and updated as ADF); its reference value is a three-column `Key`/`Copy`/`Comment` table with one header row and two empty rows. The complete raw ADF, exact schemas, official PUT shapes, citations, and concurrency analysis are in [`../research/reference-table-and-field-schema.md`](../research/reference-table-and-field-schema.md). Jira's Edit issue API documents `409 Conflict` but exposes no caller-supplied version or conditional compare-and-set, so it cannot atomically guarantee “initialize only while still empty.”
