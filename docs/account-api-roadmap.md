# TRMNL Account API Roadmap

Research verified: 2026-08-02

This roadmap proposes the next authenticated TRMNL operations for the n8n node. It is a planning document, not an API commitment. Implementations should be checked against the current [TRMNL Account API documentation](https://docs.trmnl.com/go/private-api/account), [Display API documentation](https://docs.trmnl.com/go/private-api/screens), and [OpenAPI specification](https://trmnl.com/api-docs/openapi.yaml) when each slice begins.

## Product Boundary

The useful role for n8n is an automation backend for an existing TRMNL account: discover devices and plugin instances, read their state, update supported plugin data or markup, and make deliberate playlist changes.

The existing **Private Plugin > Set Content** operation remains the simplest way to send webhook merge variables. Account API operations should use the existing **TRMNL Account API** credential and its `user_...` Bearer token. TRMNL says Account API access requires a developer license.

Do not present this node as firmware, a TRMNL server replacement, or a way to push immediately to physical hardware. TRMNL devices still retrieve content on their refresh/check-in cycle.

## Recommended Implementation Slices

The first focused slice implements the read-only **Device > List** and **Device > Get** operations. The remaining discovery operations below are still roadmap items.

### 1. Account discovery and plugin-setting reads

Implement this first as one read-only PR:

- **Device > List** — `GET /api/devices` (implemented)
- **Device > Get** — `GET /api/devices/{id}` (implemented)
- **Plugin Setting > List** — `GET /api/plugin_settings`, with the documented optional `plugin_id` filter
- **Plugin Setting > Get Details** — `GET /api/plugin_settings/{uuid}/details`
- **Plugin Setting > Get Data** — `GET /api/plugin_settings/{id-or-uuid}/data`

Why first: it proves the unused Account API credential and shared authenticated transport without changing hosted state. It also gives later workflows the device IDs, plugin-setting IDs/UUIDs, strategy, and supported markup sizes they need.

Implementation notes:

- Keep IDs expression-friendly so a List result can feed a later operation.
- Preserve TRMNL's response fields; do not invent a stable schema beyond the OpenAPI response.
- Handle `401`, `404`, and the documented `422` “data is not available” response distinctly.
- Do not assume pagination unless the API documents it.
- Live-test the List Plugin Settings result before claiming it is a complete account inventory. Its OpenAPI operation is named “List my plugin settings,” but the current success description mentions a narrower calendar result.

### 2. Plugin-setting data and markup management

Implement this second as a focused write-capable PR:

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

### 3. Playlist visibility

Consider after the two PRs above:

- **Playlist Item > List** — `GET /api/playlists/items`
- **Playlist Item > Set Visibility** — `PATCH /api/playlists/items/{id}` with the required boolean `visible`

These operations are useful for scheduled workflows such as hiding a work dashboard overnight. Visibility changes affect what a device can display, so the mutation should use an explicit boolean field, describe the effect clearly, and return the targeted playlist item ID. Do not imply support for reorder, duration, scheduler, or arbitrary playlist edits; the current OpenAPI documents only `visible` for updates.

### 4. Device settings, narrowly scoped

Device updates should be a later PR. If added, expose only fields with a clear account-management use case, initially sleep mode and its start/end times from `PATCH /api/devices/{id}`.

Do not expose `percent_charged` as a normal user setting. It appears in the update schema but represents device telemetry, and an n8n workflow should not casually overwrite it.

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
4. For writes, use a disposable plugin setting and verify the resulting TRMNL state separately from the n8n HTTP response.
5. Update user documentation only with behavior confirmed by the official contract and live acceptance.
