# Architecture and Product Boundaries

`n8n-nodes-trmnl` uses n8n as an automation backend for TRMNL. It does not use
n8n as device firmware or as a replacement TRMNL server. A device gets rendered
content during its refresh or check-in cycle.

## Why the Node Is Programmatic

The integration needs explicit payload validation, item pairing, response
normalization, literal Liquid handling, synchronous Polling, and safe errors.
Descriptions, actions, routing, transport, and payload helpers are different
parts. Tests can examine each part independently.

## Credential Boundaries

The package uses different credentials:

- **TRMNL Private Plugin API** identifies one documented Private Plugin Webhook
  endpoint by full URL or Plugin Setting UUID.
- **TRMNL Account API** stores the `user_` Bearer key used for Device, Playlist
  Item, and Plugin Setting operations.
- **TRMNL Polling Header Auth API** authenticates inbound requests to the TRMNL
  Trigger.

Do not use a credential for a different trust boundary. Private Plugin endpoints
accept only documented TRMNL URLs and UUID shorthand. Do not put secrets in
logs, fixtures, screenshots, or errors.

## Compatibility Contract

Names, operation values, parameters, defaults, versions, output shapes, and item
pairing are saved-workflow contracts. For a breaking or default change, add a
node version and regression tests for previous workflows.

The package has no runtime dependencies. It declares `n8n-workflow` as a peer
dependency and uses n8n strict mode. Automated checks test the package and tool
contracts. They do not prove live TRMNL behavior.

## Side-Effect Boundaries

You can set retries for read operations and Markup Render. Do not set automatic
retries for write operations. If the software sends the same write more than
one time, hosted state can change more than one time.

These surfaces are not part of the 1.0 contract:

- Async Polling callbacks
- Device Display API operations and routes that can advance playlist state
- Force Refresh
- Image upload
- Plugin lifecycle operations
- Arbitrary Plugin Setting or Device writes
- Undocumented playlist mutations

Before you add one of these surfaces, TRMNL must document its stable contract.
Live acceptance must also make sure that the contract is correct. This is a
product and security decision.

## Evidence Model

Automated checks, n8n execution, API state, portal state, device behavior, and
cleanup are different claims. Use the
[manual test matrix](manual-test-matrix.md) for live checks and checks that
change hosted state.

## Release Model

Only a stable GitHub Release starts publication. The tag supplies the npm
version. Trusted Publishing supplies provenance. Refer to
[Releasing](releasing.md) for instructions.
