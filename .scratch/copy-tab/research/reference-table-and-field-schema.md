# Reference table and Jira field schema

Research performed 2026-09-09 against Jira Cloud REST API v3 and this repository. No credentials or authorization material are included below.

## Findings

### Field identities and schemas

A live `GET /rest/api/3/issue/EBBACKLOG-25185?fields=customfield_11302,customfield_11285&expand=names,schema`, corroborated by `GET /rest/api/3/field`, returned:

| Field ID | Exact Jira name | Jira schema | Value on EBBACKLOG-25185 |
|---|---|---|---|
| `customfield_11302` | `Copy & Translations` | `{ "type": "option", "custom": "com.atlassian.jira.plugin.system.customfieldtypes:select", "customId": 11302 }` | `{ "value": "Copy - ready to start", "id": "11352", "self": ".../rest/api/3/customFieldOption/11352" }` |
| `customfield_11285` | `Translation keys` | `{ "type": "string", "custom": "com.atlassian.jira.plugin.system.customfieldtypes:textarea", "customId": 11285 }` | ADF document reproduced in full below |

The field registry also reports the JQL clause names `Copy & Translations[Dropdown]`, `cf[11302]`, `Copy & Translations`, and `Translation keys[Paragraph]`, `cf[11285]`, `Translation keys`. Both fields are custom, orderable, navigable, and searchable. These are live-instance facts from the two Jira endpoints above. Atlassian documents that `GET /rest/api/3/field` returns field details including each field's name and schema.[1]

The repository currently reads `customfield_11302` as `{ value: string } | null` and maps its `value` to `copyStatus`, consistent with the live response.[2] The live response additionally proves that consumers should tolerate the option object's `id` and `self` properties.

Atlassian states that `textarea` custom fields use Atlassian Document Format (ADF), while single-line `textfield` fields use strings.[3] `Translation keys` is therefore read and written as an ADF document even though its field metadata schema says `type: "string"`.

### Complete Translation keys template

This is the complete raw `customfield_11285` value returned for EBBACKLOG-25185 on 2026-09-09. It is a version 1 ADF document containing one left-aligned, non-numbered table with three columns (`Key`, `Copy`, `Comment`), one header row, and two empty body rows. The header text has `strong` marks. Empty cells contain paragraph nodes with no `content` property. All observed Jira-generated `localId` values are preserved exactly.

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "table",
      "attrs": {
        "isNumberColumnEnabled": false,
        "layout": "align-start",
        "localId": "46a8212e-4198-49ea-b8ab-dcdccc1d44ae"
      },
      "content": [
        {
          "type": "tableRow",
          "attrs": {
            "localId": "a5f10b88e85a"
          },
          "content": [
            {
              "type": "tableHeader",
              "attrs": {
                "localId": "f523629022e3"
              },
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "type": "text",
                      "text": "Key",
                      "marks": [
                        {
                          "type": "strong"
                        }
                      ]
                    }
                  ],
                  "attrs": {
                    "localId": "27be9aa11183"
                  }
                }
              ]
            },
            {
              "type": "tableHeader",
              "attrs": {
                "localId": "f9f715caeab5"
              },
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "type": "text",
                      "text": "Copy",
                      "marks": [
                        {
                          "type": "strong"
                        }
                      ]
                    }
                  ],
                  "attrs": {
                    "localId": "e1e0b474cbbd"
                  }
                }
              ]
            },
            {
              "type": "tableHeader",
              "attrs": {
                "localId": "4b4e00466479"
              },
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "type": "text",
                      "text": "Comment",
                      "marks": [
                        {
                          "type": "strong"
                        }
                      ]
                    }
                  ],
                  "attrs": {
                    "localId": "90ee91169cf2"
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "tableRow",
          "attrs": {
            "localId": "0f1dc4ec63c4"
          },
          "content": [
            {
              "type": "tableCell",
              "attrs": {
                "localId": "0bb5a1f4b9ca"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "localId": "7c085926c93f"
                  }
                }
              ]
            },
            {
              "type": "tableCell",
              "attrs": {
                "localId": "05a629f416d2"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "localId": "5783200410c9"
                  }
                }
              ]
            },
            {
              "type": "tableCell",
              "attrs": {
                "localId": "f99690030059"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "localId": "a9dabd6477d6"
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "tableRow",
          "attrs": {
            "localId": "505928dcccfb"
          },
          "content": [
            {
              "type": "tableCell",
              "attrs": {
                "localId": "a8b1b2429c09"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "localId": "c9e0aebfa61a"
                  }
                }
              ]
            },
            {
              "type": "tableCell",
              "attrs": {
                "localId": "58a4dcfcf55f"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "localId": "48f778b3b47b"
                  }
                }
              ]
            },
            {
              "type": "tableCell",
              "attrs": {
                "localId": "5f987016a2a7"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "localId": "9ccad3a80185"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

This hierarchy agrees with Atlassian's ADF specification: a document has a root `doc` with `version` and ordered `content`; `table` is a top-level node containing `tableRow` nodes; rows contain `tableHeader` or `tableCell` nodes, whose content can contain paragraphs.[4][5][6]

### Official update shape

The official endpoint is `PUT /rest/api/3/issue/{issueIdOrKey}` with `Content-Type: application/json`. Jira accepts direct field assignments in `fields` or field operations in `update`; a field cannot appear in both. For this textarea field, direct replacement is:

```json
{
  "fields": {
    "customfield_11285": {
      "type": "doc",
      "version": 1,
      "content": [
        "...complete table node above..."
      ]
    }
  }
}
```

The equivalent documented `update` form uses a `set` operation:

```json
{
  "update": {
    "customfield_11285": [
      {
        "set": {
          "type": "doc",
          "version": 1,
          "content": [
            "...complete table node above..."
          ]
        }
      }
    ]
  }
}
```

The endpoint normally returns `204 No Content`, or `200` when `returnIssue=true`; its documented errors include `409 Conflict` when Jira itself cannot apply an update because of a conflicting update.[3][7]

### Conditional-write and concurrency conclusion

Jira Cloud REST v3 does **not expose a caller-supplied issue version, field-value precondition, `If-Match`/ETag condition, or compare-and-set operation** on the Edit issue endpoint. The official request schema contains only `fields`, `update`, `historyMetadata`, `properties`, and `transition`; its query parameters likewise contain no concurrency token.[7] The Get issue response schema does not expose an issue version usable by Edit issue.[7]

The documented `409 Conflict` is a possible server response, not an API mechanism by which DevMan can say “write this ADF only if `customfield_11285` is still empty.” Therefore a read-empty-then-PUT sequence has a time-of-check/time-of-use race and can overwrite content written between those requests. A second read immediately before the PUT narrows but does not eliminate that race. The ADF root's `version: 1` is the ADF format version, not an issue revision or concurrency token.[4]

This means Jira's ordinary issue API alone cannot satisfy a strict atomic empty-only initialization guarantee. The downstream contract must either accept a best-effort reread plus residual race, or introduce serialization/locking outside Jira (with the caveat that external Jira writers cannot participate in that lock). No write was issued during this research.

## Sources

1. Atlassian, Jira Cloud REST API v3, **Get fields**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-get
2. Repository, `packages/server/src/services/missions.ts`, field request and `copyStatus` mapping around lines 227 and 268.
3. Atlassian, Jira Cloud REST API v3, **Edit issue**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-put
4. Atlassian, **Atlassian Document Format**: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
5. Atlassian, ADF **table** node: https://developer.atlassian.com/cloud/jira/platform/apis/document/nodes/table/
6. Atlassian, ADF **tableHeader** and **tableCell** nodes: https://developer.atlassian.com/cloud/jira/platform/apis/document/nodes/table_header/ and https://developer.atlassian.com/cloud/jira/platform/apis/document/nodes/table_cell/
7. Atlassian, Jira Cloud REST API v3 OpenAPI specification, `IssueUpdateDetails` and `editIssue`: https://dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json
8. Live first-party Jira Cloud responses, `GET /rest/api/3/issue/EBBACKLOG-25185?fields=customfield_11302,customfield_11285&expand=names,schema` and `GET /rest/api/3/field`, retrieved 2026-09-09 through the repository's configured authentication mechanism.
