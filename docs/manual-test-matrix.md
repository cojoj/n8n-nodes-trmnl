# Manual Test Matrix

Use this procedure for release candidates and changes that affect credentials,
requests, Polling, rendering, hosted state, or device-facing behavior. It is an
evergreen checklist, not a release evidence log. Record dated results with the
release or pull request being validated.

## Evidence Boundaries

Record these layers separately:

1. automated unit and package checks;
2. installed-node behavior in n8n;
3. TRMNL API acceptance or stored state;
4. signed-in portal, Activity, or rendered-preview state;
5. physical-device behavior after refresh; and
6. restoration and cleanup.

A successful n8n execution or HTTP response is not evidence for the later
layers.

## Preconditions

1. Run the sequential quality gate:

   ```bash
   pnpm install --frozen-lockfile
   pnpm test
   pnpm lint
   pnpm format:check
   pnpm pack --dry-run
   pnpm exec n8n-node cloud-support
   ```

2. Install the packed or published candidate in a fresh supported n8n user
   folder. Record the package, Node.js, and n8n versions.
3. Import both workflows from `examples/` at the exact candidate commit or tag;
   do not use the moving `main` branch as candidate evidence. They must resolve
   `n8n-nodes-trmnl.trmnl` and `n8n-nodes-trmnl.trmnlTrigger`; an unknown-node
   placeholder is a failure.
4. Use a disposable Webhook Private Plugin and unique run marker. Do not test
   destructive merge behavior against production data.
5. Use dedicated, temporary credentials. Never retain API keys, Webhook URLs,
   Plugin Setting UUIDs, Polling header values, account data, or device IDs in
   screenshots, logs, issues, or the repository.
6. For Polling, expose only the dedicated production webhook over trusted HTTPS.
   Do not expose the n8n editor or unrelated routes.
7. For Account API writes, use a disposable compatible Plugin Setting, a
   nonessential Playlist Item, and an explicitly chosen Device. Before MT-19,
   confirm Get Data succeeds for the target; a Webhook Private Plugin uses
   Private Plugin Set/Get Content instead. Save exact original values outside
   the repository before any mutation.
8. Do not run MT-19, MT-21, MT-23, or MT-24 without an explicit checkpoint.
   Restore and independently verify each original value before continuing.

## Private Plugin and Markup

<!-- prettier-ignore -->
| ID | Scenario | Required result |
| --- | --- | --- |
| MT-01 | Set Content with Replace and a unique marker | One paired successful item; stored variables, Activity, and preview contain the marker. Do not claim device delivery. |
| MT-02 | Get Content after MT-01 | Returned content matches stored variables without creating a new render or device update. |
| MT-03 | Invalid JSON such as `{"title":}` | n8n blocks it or reports valid-JSON failure before an HTTP request. |
| MT-04 | Non-object JSON such as `[]` | Local object validation fails before an HTTP request. |
| MT-05 | Payload larger than the selected Regular (2 KB) or TRMNL+ (5 KB) limit | Local byte-size validation fails; no Activity or hosted-state change occurs. |
| MT-06 | Replace, then Deep Merge, then Get Content | Updated nested values change while untouched nested and top-level values remain. |
| MT-07 | Replace, then two Stream updates with a limit | Stored arrays append and trim to the configured limit; all retained top-level keys are sent on every update. |
| MT-08 | Safe 404 or naturally occurring API failure, with and without On Error → Continue | Normal mode fails without success output. Continue mode exposes only redacted resource, operation, status, and optional Retry-After context. |
| MT-09 | Credential tests for a full Webhook URL, UUID, malformed value, and nonexistent UUID | Real URL and UUID succeed read-only; malformed and nonexistent values fail without exposing the endpoint or identifier. |
| MT-10 | Markup Render with `Markup Source: Define Below` and `Variables Source: Input Data`, then `Markup Source: From Input Field`, then explicit JSON variables | Each incoming item's JSON is used automatically by the v1.2 default. A string in the selected top-level input field is used as that item's literal Liquid template without n8n evaluating its `{{ }}` syntax. All modes return the expected string, expose `rendered`, and preserve the complete response. Missing or non-string template fields fail locally. No credential is required, no hosted plugin state changes, and the supplied markup and variables are sent to TRMNL. |
| MT-11 | Activity, preview, and physical device after a final clean Replace | n8n output, Activity, and preview correlate to one marker. The physical device shows the same marker only after its pull/check-in. |

TRMNL documents small payload and request-rate limits. Avoid rapid retries and
never flood the service to manufacture a 429 response.

## Polling Trigger

<!-- prettier-ignore -->
| ID | Scenario | Required result |
| --- | --- | --- |
| MT-12 | Active Polling workflow using its public production URL | Hosted TRMNL starts one execution and receives HTTP 200 with the final node's first root JSON object, without an n8n envelope. |
| MT-13 | Polling Header Auth with matching, wrong, and missing values | Matching auth starts one execution and renders expected variables. Wrong and missing values return 401 without executions. Workflow input contains no request headers. Remove the public exposure and temporary secret afterward. |

## Account API Reads

<!-- prettier-ignore -->
| ID | Scenario | Required result |
| --- | --- | --- |
| MT-14 | Device → List | One item per returned device; no hosted state changes. |
| MT-15 | Device → Get using an ID from MT-14 | One matching device item; no hosted state changes. |
| MT-16 | Plugin Setting → List, with and without a documented filter | Returned fields are preserved and the filter is sent only when supplied. Do not claim a complete inventory beyond the response. |
| MT-17 | Plugin Setting → Get Details | Detail fields are preserved without recording real identifiers. No hosted state changes. |
| MT-18 | Plugin Setting → Get Data by supported identifier | Data is preserved without a fixed schema. Natural 401/404/422 cases remain credential-safe; do not mutate state to manufacture an error. |
| MT-20 | Plugin Setting → Read Markup | Exact literal content matches the editor. Save a protected exact backup outside the repository before MT-21. |
| MT-22 | Playlist Item → List | One item per returned playlist item with fields preserved; no hosted state changes. |

## Account API Writes and Restoration

<!-- prettier-ignore -->
| ID | Scenario | Required result |
| --- | --- | --- |
| MT-19 | Plugin Setting → Update Data on a compatible target preflighted with Get Data | Save the exact data externally, then send only `merge_variables`; an independent Get Data shows the marker. Restore the exact backup and verify it independently. Do not use a Webhook Private Plugin or call this a render, Force Refresh, or device update. |
| MT-21 | Plugin Setting → Write Markup, then restore | Literal content and preview show the temporary marker. Write the exact backup, then independently verify the restored source and marker-free preview. |
| MT-23 | Playlist Item → Set Visibility, then restore | n8n output, a subsequent List, and the signed-in Playlist UI agree on both the temporary value and exact restored value. Do not claim a content push. |
| MT-24 | Device → Update Sleep Mode, then restore | The request includes only the documented sleep fields. Device Get and the signed-in settings UI agree on the temporary and exact restored values. Physical behavior is a separate optional observation. |

Every write is a single attempt. If a step fails, stop and restore the target
before diagnosing or changing code.

## Cleanup

Before declaring acceptance complete:

- restore or delete every disposable TRMNL target;
- remove temporary n8n workflows, credentials, user folders, files, and public
  exposure;
- verify hosted and portal state independently after restoration;
- clear temporary secrets and protected backups when no longer needed; and
- rerun the automated quality gate from a clean checkout.

Unexpected hosted behavior is an observation first. Do not turn it into a
documented contract or code change until the official API and a reproducible
test support it.
