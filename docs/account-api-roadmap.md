# TRMNL Account API Roadmap

Research verified against the live OpenAPI specification and hosted Private Plugin form: 2026-08-09

This roadmap proposes the next authenticated TRMNL operations for the n8n node. It is a planning document, not an API commitment. Implementations should be checked against the current [TRMNL Account API documentation](https://docs.trmnl.com/go/private-api/account), [Display API documentation](https://docs.trmnl.com/go/private-api/screens), and [OpenAPI specification](https://trmnl.com/api-docs/openapi.yaml) when each slice begins.

## Product Boundary

The useful role for n8n is an automation backend for an existing TRMNL account: discover devices and plugin instances, read their state, update supported plugin data or markup, and make deliberate playlist changes.

The existing **Private Plugin > Set Content** operation remains the simplest way to send webhook merge variables. Account API operations should use the existing **TRMNL Account API** credential and its `user_...` Bearer token. TRMNL says Account API access requires a developer license.

Do not present this node as firmware, a TRMNL server replacement, or a way to push immediately to physical hardware. TRMNL devices still retrieve content on their refresh/check-in cycle.

## Recommended Implementation Slices

The first focused slice includes the read-only **Device** and **Plugin Setting** discovery operations. Device reads shipped in 0.1.0; Plugin Setting reads shipped in 0.2.0. The second slice added Plugin Setting data and markup management in 0.3.0. Reliability hardening shipped in 0.4.0. Playlist visibility and narrow Device sleep controls shipped in 0.5.0 after separate hosted acceptance.

### 1. Account discovery and plugin-setting reads — implemented

Implement this first as one read-only PR:

- **Device > List** — `GET /api/devices` (implemented)
- **Device > Get** — `GET /api/devices/{id}` (implemented)
- **Plugin Setting > List** — `GET /api/plugin_settings`, with the documented optional `plugin_id` filter (implemented for 0.2.0)
- **Plugin Setting > Get Details** — `GET /api/plugin_settings/{uuid}/details` (implemented for 0.2.0)
- **Plugin Setting > Get Data** — `GET /api/plugin_settings/{id-or-uuid}/data` (implemented for 0.2.0)

Why first: it proves the Account API credential and shared authenticated transport without changing hosted state. Live List and Details results must prove which IDs, UUIDs, strategies, and markup sizes are actually available before later operations promise dynamic selection.

Implementation notes:

- Keep IDs expression-friendly so a List result can feed a later operation.
- Preserve TRMNL's response fields; do not invent a stable schema beyond the OpenAPI response.
- Handle `401`, `404`, and the documented `422` “data is not available” response distinctly.
- Do not assume pagination unless the API documents it.
- Live-test the List Plugin Settings result before claiming it is a complete account inventory. Its OpenAPI operation is named “List my plugin settings,” but the current success description mentions a narrower calendar result.

Hosted acceptance on 2026-08-08 confirmed the manual-string UX: the tested List response contained numeric setting and plugin IDs but no Plugin Setting UUID, while Get Details accepted a known UUID without returning that target UUID or an available-markup-size list. This is evidence for the tested account and setting, not a promise that TRMNL will never supply those fields. Keep the full response and revisit a dynamic selector only when live output reliably connects the required identifiers.

### 2. Plugin-setting data and markup management — implemented for 0.3.0

Implemented as a focused write-capable PR, separate from the 0.2.0 read release:

- **Plugin Setting > Update Data** — `POST /api/plugin_settings/{id-or-uuid}/data` with a JSON-object `merge_variables` body
- **Plugin Setting > Read Markup** — `GET /api/plugin_settings/{uuid}/markup/{size}`
- **Plugin Setting > Write Markup** — `PUT /api/plugin_settings/{uuid}/markup/{size}` with a string `content` body

Why second: these operations turn n8n into a useful content backend while staying close to the node's existing JSON validation and literal Liquid-markup behavior.

Safety and UX requirements:

- Name the Account API write **Update Data**, not **Set Content**, so it is not confused with the existing unauthenticated Private Plugin webhook operation.
- Require merge variables to be a JSON object and keep Liquid markup literal.
- Treat `422 Data cannot be modified` as an expected capability error rather than implying every plugin setting is writable.
- Obtain or validate markup sizes from plugin-setting details. The OpenAPI only gives `markup_full` as an example and does not define a closed enum.
- Echo the target UUID, size, and operation in the n8n output, but never echo the Account API key.
- Add mocked operation tests plus live acceptance against a disposable Private Plugin before describing hosted behavior as proven.

Implementation details:

- Update Data reuses the existing native typed-fields and JSON-object helpers and sends only `merge_variables`.
- Read Markup accepts both raw-text and TRMNL's live wrapped markup response, then exposes the exact returned markup string without interpreting Liquid.
- Write Markup uses a `noDataExpression` field so Liquid braces are not evaluated as n8n expressions.
- Identifiers and size values are validated as safe path segments before HTTP; markup sizes remain open strings rather than a closed enum.
- The shared transport maps write-data and markup-size `422` errors by operation context and does not retry writes.

Live acceptance passed on 2026-08-08 with a newly created disposable Webhook Plugin Setting. The setting's `markup_full` size was initialized in the console, then local n8n proved Update Data, Read Markup, Write Markup, hosted saved state, an 800×480 rendered preview, and exact source restoration. The disposable setting was deleted afterward. No Force Refresh or physical-device delivery claim was made.

### Reliability foundation — shipped in 0.4.0

The 0.4.0 reliability slice keeps the 0.1.x through 0.3.x operation surface unchanged while centralizing external request failures across Private Plugin, Markup, Device, and Plugin Setting operations.

- Local validation remains `NodeOperationError`; external HTTP and network failures remain `NodeApiError`.
- Safe operation context distinguishes credential-boundary 401, target-aware 404, documented Plugin Setting 422 capability failures, 429 with optional `Retry-After`, and clean 5xx/network failures.
- **On Error > Continue** preserves pairing and adds only redacted resource, operation, status, and Retry-After context. Older n8n versions may label this behavior **Continue On Fail**.
- No request is retried automatically and no client-side quota counter is maintained.
- Polling remains synchronous GET/POST with optional Header Auth. The current hosted form accepts `Name: Value` or `name=value`; rejected credentials return 401 before workflow execution and incoming headers are omitted from workflow input.

Automated coverage and local n8n presentation remain release-candidate gates. Hosted Polling Header acceptance passed on 2026-08-09 through a scoped public HTTPS proxy: TRMNL's preview made exactly one authenticated request, received the final root JSON object, and rendered both expected variables. Direct requests with missing and wrong values each returned 401 without creating an execution, while the successful workflow input contained neither the authentication header nor a headers object. The tunnel and proxy were stopped, the temporary hosted plugin and credential were deleted, disposable workflows were archived, and temporary files and clipboard contents were cleared. No physical-device delivery claim was made.

### 3. Playlist visibility — shipped in 0.5.0

Implemented in the focused Account automation slice:

- **Playlist Item > List** — `GET /api/playlists/items`
- **Playlist Item > Set Visibility** — `PATCH /api/playlists/items/{id}` with the required boolean `visible`

These operations are useful for scheduled workflows such as hiding a work dashboard overnight. List preserves every returned field and emits one n8n item per member of a returned `data` array without inventing pagination, ordering, grouping, filtering, or scheduling. Set Visibility requires a positive numeric ID, sends only an actual boolean `visible` field, and returns the target ID, requested visibility, and normalized TRMNL response.

Visibility affects playlist eligibility for future screen selection. It is not a content push, Force Refresh, or proof of physical-device behavior. Reorder, duration, scheduler, grouping, move, create, delete, and arbitrary playlist edits remain out of scope.

### 4. Device settings, narrowly scoped — shipped in 0.5.0

**Device > Update Sleep Mode** calls `PATCH /api/devices/{id}` and exposes only fields with a clear account-management use case:

- `sleep_mode_enabled` through a boolean control;
- `sleep_start_time` and `sleep_end_time` as minute-of-day numbers from `0` through `1439`, visible and sent only when sleep mode is enabled.

The installed n8n node-property contract does not expose a stable time-input type even though runtime validation contains time parsing, so explicit minute-of-day controls avoid an unstable UI abstraction. The operation returns the target Device ID, normalized requested settings, and normalized TRMNL response.

`percent_charged` is deliberately not exposed or forwarded. It appears in the update schema but represents device telemetry, and an n8n workflow should not casually overwrite it. The sleep operation changes account configuration; it does not push content, Force Refresh, or prove physical-device behavior.

Both 0.5.0 mutations reuse the centralized 0.4.x transport and error behavior, retain per-item pairing under **On Error > Continue**, and make exactly one HTTP attempt per input item. Automated coverage and live acceptance passed on 2026-08-09. Playlist Set Visibility was verified through local n8n, a subsequent Account API List, and the signed-in Playlist UI before the exact original boolean was restored and reverified. Device Update Sleep Mode was verified through local n8n, a subsequent Device Get, and the signed-in Battery & Sleep UI before the exact original enabled/start/end settings were restored and reverified. No physical-device behavior was claimed.

## Display APIs Are a Separate Credential Boundary

The display endpoints use a Device API key in the `Access-Token` header, not the Account API Bearer token:

- `GET /api/display/current` fetches the current screen without advancing the playlist.
- `GET /api/display` fetches the next screen and, according to TRMNL's Display API documentation, automatically advances the playlist.

If display access is added later, it needs a separate **TRMNL Device API** credential. **Get Current Screen** is the only sensible first operation.

Do not include **Get Next Screen** in the initial Account API work. Despite using HTTP `GET`, it changes server-side playlist state. An automation, retry, health check, or accidental loop could advance content unexpectedly and alter what the physical device receives next. If it is ever exposed, it should be an advanced opt-in operation with an explicit side-effect warning and no automatic retries.

The account's device list must not be treated as a source of Device API keys; the OpenAPI device response does not document those keys.

## Force Refresh

TRMNL's UI and plugin guidance mention a **Force Refresh** control, but the current OpenAPI specification does not document a force-refresh endpoint. Therefore:

- do not add a Force Refresh operation;
- do not call an endpoint discovered only through browser traffic;
- do not describe Update Data, Write Markup, playlist visibility, or display-current as a physical-device refresh;
- continue to tell users that server-side changes appear on the device's next refresh/check-in.

Revisit this only if TRMNL publishes an authenticated endpoint and its effects, credential type, rate limits, and retry behavior.

## Deferred or Out of Scope

Keep these out of the first Account API slices:

- plugin-setting create/delete and archive import/export, because they have larger lifecycle and data-loss implications;
- image upload until multipart shape, device/model limits, rate limits, and a real `webhook_image` flow are verified;
- arbitrary plugin-setting fields through `/settings` until supported field names and validation semantics are documented;
- playlist reorder, duration, scheduling, or grouping, which the current OpenAPI does not document as writable;
- automatic playlist advancement and undocumented force refresh;
- npm publication or a release as part of Account API development.

## Acceptance Bar for Each Implementation PR

1. Add mocked success and documented error-path coverage.
2. Run `pnpm test`, `pnpm lint`, and `pnpm pack --dry-run`.
3. Exercise the operation in local n8n with the intended credential type.
4. For writes, use a disposable or safe nonessential target, record the exact original state, verify the resulting TRMNL state separately from the n8n HTTP response, then restore and independently verify the original state.
5. Update user documentation only with behavior confirmed by the official contract and live acceptance.

## 1.0 Readiness Boundary

The Account API surface required for 1.0 is already shipped and accepted. The remaining 1.0 gate is release-candidate evidence for the package as a whole: clean installation on supported n8n/Node, successful import of both examples, completion of MT-01 through MT-11 including physical-device confirmation, full quality gates, and verified cleanup. Display APIs, Force Refresh, image upload, arbitrary settings, and plugin lifecycle operations remain later milestones rather than 1.0 blockers.
