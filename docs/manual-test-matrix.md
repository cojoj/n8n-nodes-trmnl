# Manual Test Matrix

Use this matrix to validate a release candidate against local n8n, TRMNL's hosted service, the Private Plugin Activity/log view, and a physical device. Run the automated checks first; they do not replace the live checks in this document.

Official TRMNL behavior covered here:

- `POST` to a Private Plugin webhook sets `merge_variables`; `GET` reads them from the same endpoint.
- `deep_merge` combines nested values with stored data.
- `stream` appends values in top-level arrays and applies `stream_limit`.
- Request bodies are limited to 2 KB for regular accounts and 5 KB for TRMNL+.

See [TRMNL's webhook documentation](https://docs.trmnl.com/go/private-plugins/webhooks) for the current service contract.

## Preconditions

1. Build and test the package with `pnpm test` and `pnpm lint`.
2. Start local n8n with `pnpm dev` and install/link this checkout as directed by `n8n-node`.
3. Use a dedicated TRMNL Private Plugin configured with the **Webhook** strategy and the example in `examples/private-plugin-dashboard/`.
4. Create a **TRMNL Private Plugin API** credential from the saved plugin's full Webhook URL or Plugin Setting UUID.
5. Put the test plugin on the target device's playlist. Record the device's normal refresh interval.
6. Add a unique run marker such as `manual-YYYYMMDD-HHMM` to successful payloads so that n8n output, TRMNL Activity, preview, and device state can be correlated.
7. Avoid rapid retries. TRMNL documents webhook rate limits; Debug Logs can temporarily raise the development allowance.

Use a fresh copy of the example workflow for destructive merge-strategy checks. Do not use production plugin data.

## Matrix

Fill **Result** with `PASS`, `FAIL`, or `BLOCKED`, and link or describe the captured evidence.

| ID | Scenario | Procedure | Expected n8n result | Expected TRMNL/live result | Offline coverage | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| MT-01 | Successful Set Content | Select **Private Plugin > Set Content**, **Replace**, and **Using JSON**. Send `{"title":"manual-YYYYMMDD-HHMM","message":"set success","items":[]}`. | One output item with `operation: "setContent"`, `success: true`, `mergeStrategy: "replace"`, byte counts, echoed variables, `deviceUpdate: "next_refresh"`, and the webhook response. | The plugin's stored variables and preview contain the unique marker. Activity/logs show the accepted update. The device is not expected to change immediately. | Mocked POST, body, endpoint normalization, and diagnostic output. | |
| MT-02 | Successful Get Content | After MT-01, change the operation to **Get Content** and execute once. | One output item with `operation: "getContent"`, `success: true`, and the service response containing the current stored content. | Values match MT-01. GET must not be treated as proof of a new render or device refresh. | Mocked authenticated GET and output shaping. | |
| MT-03 | Invalid Merge Variables JSON | In **Using JSON**, enter `{"title":}`. If the editor blocks invalid JSON, use an expression that resolves to that string and execute. | Execution is blocked by n8n or fails with `Merge Variables must contain valid JSON.` No success output is produced. | No webhook POST, Activity entry, stored-data change, render, or device change. | Helper and operation-level rejection before HTTP. | |
| MT-04 | Non-object Merge Variables JSON | Enter `[]` in **Using JSON** and execute. | Fails with `Merge Variables must be a JSON object.` | No webhook POST, Activity entry, stored-data change, render, or device change. | Helper and operation-level array rejection before HTTP. | |
| MT-05 | Oversized payload | Set **Payload Limit Bytes** to `100`; send `{"blob":"` plus at least 200 ASCII characters plus `"}`. | Fails locally with the measured size and configured limit in the message. No success output is produced. Repeat with the normal 2048-byte limit if release acceptance requires the real account boundary. | No Activity entry or stored-data/device change because the node must fail before POST. | Operation-level byte-limit rejection before HTTP; UTF-8 byte calculation. | |
| MT-06 | Deep Merge | First use **Replace** with `{"sensor":{"temperature":20,"humidity":50},"label":"manual-deep-merge"}`. Then use **Deep Merge** with `{"sensor":{"temperature":21}}`. Run **Get Content**. | Both writes succeed. The second output reports `mergeStrategy: "deep_merge"`. GET shows temperature `21`, humidity `50`, and the original label. | Activity/logs show both accepted writes; stored variables and preview preserve untouched nested/top-level values. | Helper serialization and mocked operation body. Hosted state semantics remain manual. | |
| MT-07 | Stream | Reset with **Replace**: `{"temperatures":[40],"label":"manual-stream"}`. Send **Stream**, limit `3`: `{"temperatures":[41,42],"label":"manual-stream"}`. Send another Stream update with `[43]`, again including the label. Run **Get Content**. | Stream writes report `mergeStrategy: "stream"` and `streamLimit: 3`. GET shows the latest three temperature values in service order. | Activity/logs show accepted writes; stored values and preview demonstrate append and trimming. Include every top-level key that should remain and record any hosted behavior that differs. | Helper serialization, stream-limit validation, and mocked operation body. Hosted accumulation semantics remain manual. | |
| MT-08 | Webhook/API failure | Duplicate the credential and use a syntactically valid but nonexistent Plugin Setting UUID, or reproduce a known 404/429/5xx without changing the real plugin. Run Set or Get once. Then enable **Continue On Fail** and repeat once. | Normal mode fails as an API error and must not emit `success: true`. Continue On Fail emits an item with an `error` field so downstream nodes can continue. Record status code and message shown by n8n. | The real plugin's stored data, preview, and device remain unchanged. A rate-limit test is optional; do not intentionally flood the service. | HTTP failures are classified as `NodeApiError`; Continue On Fail output is mocked. Exact hosted messages/statuses remain manual. | |
| MT-09 | Credential validation | Test and save one credential with the real full Webhook URL, then one with its UUID only. Try an empty value, invalid characters such as `bad uuid`, and a valid-looking nonexistent UUID. | Real URL and UUID tests succeed. Empty input is required/blocked. Invalid or nonexistent values fail validation and are not mistaken for a valid connection. Private Plugin operations request this credential; Markup Render does not. | Successful validation is consistent with a GET to the actual plugin endpoint and does not change stored content. | Credential field is required and masked; endpoint normalization is unit-tested. Live credential-test requests remain manual. | |
| MT-10 | Successful Markup Render | Select **Markup > Render**. Use `Hello, {{ name }}!` and variables `{"name":"manual-render"}`. Execute without a Private Plugin credential. | One output item with `operation: "render"`, `success: true`, echoed variables, top-level `rendered: "Hello, manual-render!"`, and the complete TRMNL payload under `response`. The submitted Liquid text remains literal in the request. | Inspect both `rendered` and `response.data` for `Hello, manual-render!`. This operation is independent of the Private Plugin's stored variables and device playlist. | Mocked unauthenticated `/api/markup` POST, literal Liquid markup, variables, surfaced `data`, raw response preservation, and output. Hosted renderer output remains manual. | |
| MT-11 | Activity, preview, and physical device acceptance | After MT-01 or a final clean Replace update, capture the n8n execution time and output. Check TRMNL Activity/logs and preview, then use **Force Refresh** or wait for the device's next check-in. | The successful n8n execution identifies the payload and says `deviceUpdate: "next_refresh"`; it does not claim immediate hardware delivery. | Activity/log entry and preview match the unique marker. The physical device eventually shows the same marker after its pull/check-in. Record timestamps or screenshots for all three layers. | None: requires a signed-in TRMNL account and physical device. | |

## Acceptance Rules

- A successful n8n response alone passes the transport step, not the device step.
- MT-03 through MT-05 pass only when no request reaches the real webhook.
- MT-06 and MT-07 require a final GET because POST acceptance alone does not prove stored-state semantics.
- MT-11 passes only with evidence from n8n, TRMNL Activity/preview, and the physical display.
- Record unexpected hosted behavior as an observation before changing code or documenting it as a contract.

## Automated Checks

`pnpm test` currently covers deterministic behavior without live TRMNL access:

- endpoint normalization for full webhook URLs and Plugin Setting UUIDs;
- JSON object parsing, invalid syntax, and array rejection;
- typed field assignment conversion and validation;
- UTF-8 payload byte counting and local oversize rejection;
- Replace, Deep Merge, and Stream request serialization;
- Set Content, Get Content, and Markup Render request/output shaping with mocked HTTP;
- API-error classification and Continue On Fail behavior;
- node field visibility/defaults, themed icons, and credential field masking/requirements.

The hosted merge-state result, actual credential test, Activity/log entry, rendered preview, rate-limit response, and physical-device refresh cannot be proven offline.
