# 07: Document the Wayfinder Jira convention

**What to build:** A new section in the repo's existing Jira tribal-knowledge doc (the one CLAUDE.md already points to for undocumented custom-field/label/query conventions) covering everything a future reader needs to safely touch Wayfinder-related Jira data without re-deriving it from this spec or the map.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] New section added covering: the `wayfinder:map` Story label (marks a Story as a Wayfinder map; its Subtasks are the map's tickets) and the `wayfinder:<research|prototype|grilling|task>` Subtask labels (each ticket's type).
- [ ] Section documents that dependencies are native Jira `Blocks`/`is blocked by` issue links, records the confirmed link-type identity (id, name, inward/outward strings) verified live against this Jira instance, and notes that these strings are admin-editable per instance so the link-type id is the more robust thing to key on if this ever needs re-verifying.
- [ ] Section documents the frontier/claimed/blocked/done derivation precedence exactly: Done (status category done) → Claimed (has an assignee) → Blocked (has at least one non-Done blocker) → Frontier (none of the above).
- [ ] Section notes the intra-Story-only scope boundary: a dependency edge to an issue outside the current Story's own Subtask set is dropped, not surfaced.
- [ ] No code changes in this ticket — documentation only.

## Reference

Full source material for this section: [Wayfinder tab map](../map.md), especially [ticket 01](01-define-wayfinder-map-and-tab-scope.md) (label/derivation definitions) and [ticket 05](05-apply-example-labels.md) (confirmed live link-type identity). See also the [spec](../spec.md)'s "Implementation Decisions" (Documentation) and "Testing Decisions" sections for framing.
