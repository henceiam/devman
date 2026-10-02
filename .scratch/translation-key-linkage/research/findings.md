# Translation key representation and Jira linkage

Context: [Wayfinder research ticket #3](https://github.com/henceiam/devman/issues/3)
in `henceiam/devman`.

## Findings

- `DoctrinAB/translations` stores key metadata in `i18n.json` and localized
  strings in flat key-to-value JSON files under each locale. For the shared
  baseline, these are `base/i18n.json` and `base/<locale>/root.json`; concrete
  environments such as `stage`, `prod`, and `demo` can override baseline
  values, with optional unit-specific files. The repository describes a
  translation as determined by key, locale, environment, and unit. Keys are
  dot-separated names such as `a11y.button.back`; its metadata is in the
  registry and its English value is in `base/en-GB/root.json`. The baseline
  locale folders are `cs-CZ`, `da-DK`, `en-GB`, `fr-FR`, `nb-NO`, `nl-NL`,
  `sv-SE`, and `uk-UA`. [README: model and layout](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/README.md#L34-L66),
  [README: file layout](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/README.md#L96-L112),
  [README: naming guidance](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/README.md#L202-L207),
  [key metadata](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/base/i18n.json),
  [English value file](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/base/en-GB/root.json),
  [baseline locale directories](https://github.com/DoctrinAB/translations/tree/813710a7e6139a37172dd38df15e282d23b878c4/base).
- Jira `customfield_11285` (“Translation keys”) is read as an ADF table, not
  plain text. The repository's Jira reader names its columns `Key / Copy /
  Comment` and traverses the table rows/cells. [Jira reader: field and columns](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/.dctl/tasks/scripts/jira-issue.ts#L63-L66),
  [ADF table parsing](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/.dctl/tasks/scripts/jira-issue.ts#L92-L168),
  [translation instructions: ticket table](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/.agents/skills/doctrin-translate/SKILL.md#L46-L66).
- The documented matching convention is the **exact key string** in the Jira
  table's Key cell. Repository instructions explicitly prohibit approximating,
  renaming, or substituting a similar key; they determine whether a key is
  existing by searching the registry and locale files. The update task reads
  the Jira ticket associated with the introducing PR and reconciles its listed
  keys with new keys and the translation registry. [Exact-key rules](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/.agents/skills/doctrin-translate/SKILL.md#L19-L29),
  [matching procedure](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/.agents/skills/doctrin-translate/SKILL.md#L124-L156),
  [update task](https://github.com/DoctrinAB/translations/blob/813710a7e6139a37172dd38df15e282d23b878c4/.dctl/tasks/update-translations.yml#L1-L105).
- `Copy` is the Jira table's reference-copy column; localized values live in
  locale files (for example, the English locale is `en-GB`). The sources
  inspected do not specify that Jira's `Copy` must always equal the `en-GB`
  value, so that equivalence should not be assumed. No per-key Jira identifier
  was found in the registry or locale data; the update workflow associates
  work with a ticket by extracting its key from the PR branch and fetching
  that Jira issue.

## Scope note

Findings are based on the repository's versioned source and documented
workflow; no live Jira field value was fetched. No application code or product
behavior was changed.
