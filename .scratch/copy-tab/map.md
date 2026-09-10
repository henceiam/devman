# Specify the Copy tab for issue details

Label: wayfinder:map

## Destination

An implementation-ready specification for an EBBACKLOG issue-detail **Copy** tab, including its Jira read/write contract, conditional visibility, table rendering, safe initialization behavior, and verification expectations.

## Notes

- Planning only: implementation is out of scope for this map.
- Consult the `grilling` and `domain-modeling` skills for HITL decisions and the `research` skill for external facts.
- Preserve the repository's documented EBBACKLOG custom-field constraints.
- The Copy tab appears only when an EBBACKLOG issue has the exact, case-sensitive label `copy` or `copy-clinical`.
- Eligibility applies to every issue type, including subtasks; only the EBBACKLOG project and exact label determine eligibility.
- The tab shows Copy & Translations (`customfield_11302`) read-only, using `Not set` when absent.
- Translation keys (`customfield_11285`) is read-only when populated and rendered faithfully from Jira ADF, including tables.
- Missing, null, and structurally contentless ADF count as empty; an existing table counts as initialized even when its cells are blank.
- Empty Translation keys can be initialized in one click with the table structure from EBBACKLOG-25185. The action must not overwrite a concurrently populated field.
- While initialization is saving, disable the action. On success render the table; on failure retain the action and show an inline error.

## Decisions so far

- [Establish the reference table and Jira field schema](issues/01-establish-reference-table-and-field-schema.md): verified both Jira field schemas, captured the three-column/two-row ADF template, and established that Jira offers no atomic empty-only update primitive.
- [Decide the safe Jira read/write contract](issues/02-decide-safe-jira-read-write-contract.md): chose an issue-neutral, server-owned initialization command with authoritative reads, typed conflict recovery, and an explicit residual Jira race.
- [Decide the Copy tab presentation](issues/03-decide-copy-tab-presentation.md): selected the field-sections layout with faithful scrollable ADF, a guarded empty action, in-place saving, authoritative conflict recovery, and inline errors.
- [Finalize the implementation-ready specification](issues/04-finalize-implementation-ready-specification.md): assembled the contract, presentation, code seams, acceptance criteria, and client unit-test coverage into [the spec](spec.md), leaving no design decisions for implementation.

## Not yet specified

None. The way to the destination is clear: the implementation-ready specification is at [spec.md](spec.md).

## Out of scope

- Editing an existing Translation keys value in DevMan.
- Changing Copy & Translations from DevMan.
- Applying this behavior to projects other than EBBACKLOG.
- Implementing the feature as part of this planning map.
