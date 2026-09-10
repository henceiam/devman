# Impl T6 — Docs: residual TOCTOU race + domain field updates

Type: implementation
Status: ready-for-agent
Blocked by: 01

## Scope

Documentation only. Implements spec acceptance criterion 10 and keeps CLAUDE.md/domain docs accurate per repo policy ("If you modified anything mentioned in AGENTS.md/CLAUDE.md, update it").

## Work

1. `.github/instructions/domain-logic.instructions.md`: the custom-field table already gained a `customfield_11285` row in a previous commit — verify it matches what T1 implemented (read-only in DevMan when populated; Copy-eligible issues can initialize an empty value from the canonical template; initialization is best-effort, NOT atomic — Jira has no compare-and-set for this field; a residual time-of-check/time-of-use race remains). Update wording if the implementation differs.
2. `CLAUDE.md`: under "Domain knowledge (Jira custom fields)", add `customfield_11285` = Translation keys (ADF textarea) to the field-ID list if not already implied, one line only.
3. Nothing else — no README, no new docs.

## Verification

- Docs build/lint is N/A; just accurate content.

## Completion

Report the commit hash.
