# Manual Test Matrix

Use this checklist for release candidates and integration changes. Record the
date and results in the release or pull request.

## Evidence Boundaries

Record automated checks, n8n execution, API state, portal state, device
behavior, and cleanup as different results. One result does not prove a
different result.

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

2. Install the candidate in a new supported n8n folder. Record the package,
   Node.js, and n8n versions. Create new action and Polling workflows. If n8n
   shows an unknown TRMNL node, the test fails.
3. Use disposable targets, unique markers, and temporary credentials. Keep all
   secrets and production identifiers out of evidence and the repository.
4. Expose only the Polling production webhook through trusted HTTPS.
5. Use documented, compatible Account API write targets. Save the values before
   the test in a secure location. Do not save these values in the repository.
   Create a checkpoint before MT-19, MT-21, MT-23, and MT-24. Restore each value
   before you continue. Use a different method to make sure that each restored
   value is correct.

## Private Plugin and Markup

<!-- prettier-ignore -->
| ID | Scenario | Required result |
| --- | --- | --- |
| MT-01 | Set Content with Replace and a unique marker | One paired successful item. The stored variables, Activity, and preview contain the marker. Do not claim device delivery. |
| MT-02 | Get Content after MT-01 | Returned content matches stored variables. The operation does not create a new render or device update. |
| MT-03 | Invalid JSON such as `{"title":}` | n8n blocks it or reports valid-JSON failure before an HTTP request. |
| MT-04 | Non-object JSON such as `[]` | Local object validation fails before an HTTP request. |
| MT-05 | Payload larger than the selected Regular (2 KB) or TRMNL+ (5 KB) limit | Local byte-size validation fails. Activity and hosted state do not change. |
| MT-06 | Replace, then Deep Merge, then Get Content | Updated nested values change. Untouched nested and top-level values do not change. |
| MT-07 | Replace, then two Stream updates with a limit | Stored arrays append and trim to the configured limit. Each update sends all stored top-level keys. |
| MT-08 | Safe 404 or API failure that occurs naturally, with and without On Error → Continue | Normal mode fails without success output. Continue mode exposes only redacted resource, operation, status, and optional Retry-After context. |
| MT-09 | Credential tests for a full Webhook URL, UUID, malformed value, and nonexistent UUID | The production URL and UUID pass read-only tests. Failures for malformed and nonexistent values hide the endpoint and identifier. |
| MT-10 | Markup Render with `Markup Source: Define Below` and `Variables Source: Input Data`, then `Markup Source: From Input Field`, then explicit JSON variables | By default, v1.2 uses the JSON from each input item. The selected top-level field supplies the Liquid template. n8n does not evaluate its Liquid syntax. Each mode returns the correct `rendered` string and the complete response. A missing or non-string template field causes a local error. No credential is necessary. The operation does not change hosted plugin state. The node sends the markup and variables to TRMNL. |
| MT-11 | Activity, preview, and physical device after the last clean Replace | n8n output, Activity, and preview correlate to one marker. The physical device shows the same marker only after its pull/check-in. |

TRMNL documents small payload and request-rate limits. Do not retry quickly.
Do not send requests to cause a 429 response.

## Polling Trigger

<!-- prettier-ignore -->
| ID | Scenario | Required result |
| --- | --- | --- |
| MT-12 | Active Polling workflow with its public production URL | TRMNL starts one execution. It receives HTTP 200 with the last node's first root JSON object and no n8n envelope. |
| MT-13 | Polling Header Auth with correct, incorrect, and missing values | Correct auth starts one execution and renders the expected variables. Incorrect and missing values return 401 without an execution. Workflow input contains no request headers. Remove the public exposure and temporary secret after the test. |

## Account API Reads

<!-- prettier-ignore -->
| ID | Scenario | Required result |
| --- | --- | --- |
| MT-14 | Device → List | One item for each returned device. Hosted state does not change. |
| MT-15 | Device → Get with an ID from MT-14 | One device item with the specified ID. Hosted state does not change. |
| MT-16 | Plugin Setting → List, with and without a documented filter | The node keeps all returned fields. It sends the filter only when you supply a filter. Do not claim that the response is a complete inventory. |
| MT-17 | Plugin Setting → Get Details | The node keeps all detail fields and does not record production identifiers. Hosted state does not change. |
| MT-18 | Plugin Setting → Get Data by supported identifier | The node keeps data without a fixed schema. A 401, 404, or 422 error does not contain credentials. Do not change state to cause an error. |
| MT-20 | Plugin Setting → Read Markup | The literal content is the same as the editor content. Save a protected, complete backup outside the repository before MT-21. |
| MT-22 | Playlist Item → List | One item for each returned playlist item. The node keeps all fields. Hosted state does not change. |

## Account API Writes and Restoration

<!-- prettier-ignore -->
| ID | Scenario | Required result |
| --- | --- | --- |
| MT-19 | Plugin Setting → Update Data on a documented compatible write target | Save the complete data outside the repository. Send only the documented `merge_variables` schema of the target. The Update Data response is only an acknowledgment. The result is PASS only when a Get Data operation with a different method contains the marker. A response that only echoes the marker is a failure. Restore the backup. Use a different method to make sure that the restored data is correct. Do not use a Webhook Private Plugin. Do not identify this operation as Render, Force Refresh, or a device update. |
| MT-21 | Plugin Setting → Write Markup, then restore | The literal content and preview show the temporary marker. Write the complete backup. Use a different method to make sure that the source is correct and the preview has no marker. |
| MT-23 | Playlist Item → Set Visibility, then restore | The n8n output, a subsequent List operation, and the Playlist UI show the temporary value. They also show the restored value. Do not claim a content push. |
| MT-24 | Device → Update Sleep Mode, then restore | Use 15-minute values that the settings UI can show. The Account API accepts integer minutes. Portal selectors cannot reliably show other minute values. The request contains only documented sleep fields. Device Get and the settings UI show the temporary value and the restored value. Device behavior is an optional result. |

Send each write one time. If a step fails, stop the test. Restore the target
before you examine the failure or change code.

## Cleanup

- Restore or delete disposable TRMNL targets.
- Remove temporary n8n state and public exposure.
- Remove temporary secrets and backups.
- Use a different method to make sure that restored state is correct.
- Run the quality gate from a clean checkout.

Unexpected hosted behavior is only an observation. Do not make it a documented
contract until official documentation and a repeatable test support it.
