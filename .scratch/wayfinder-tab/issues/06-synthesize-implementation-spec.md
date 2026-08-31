Type: grilling
Status: open
Blocked by: 02, 03, 04

## Question

Synthesize the bulk-fetch research (ticket 02) and both prototypes (tickets 03, 04) into one concrete, implementation-ready build spec: the exact backend endpoint/response contract (subtask `issuelinks` + `labels` shape, filtered to intra-story edges, per ticket 02), the exact frontend component structure (Wayfinder tab with a Pan & Zoom graph view as default per ticket 04, and a Frontier/Claimed/Blocked/Done grouped list view as fallback per ticket 03, plus the toggle between them and the ~14-ticket/55%-fit threshold from ticket 04 as guidance for which to default to), and where the `wayfinder:<type>` label convention and derived-state rules (frontier/claimed/unblocked) get documented so they aren't just tribal knowledge in this map — likely `.github/instructions/domain-logic.instructions.md` or a new doc referenced from `CLAUDE.md`.

Note the open caveat from ticket 02 in the spec: the real "Blocks" link-type `inward`/`outward` strings should be confirmed against the live Jira instance (ticket 05) before the build session hardcodes them — the spec can flag this as a pre-build verification step rather than being blocked on it.
