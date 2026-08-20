# Architecture and Product Boundaries

`n8n-nodes-trmnl` treats n8n as an automation backend for TRMNL, not as device
firmware or a replacement TRMNL server. A workflow changes or supplies hosted
content; the physical device retrieves rendered content on its own refresh or
check-in cycle.

## Why the Node Is Programmatic

The TRMNL APIs are HTTP-based, but the integration needs more than endpoint
mapping. The programmatic node provides:

- JSON and typed-field payload construction with UTF-8 size validation;
- per-item execution and pairing;
- operation-specific response normalization;
- literal Liquid markup handling;
- synchronous Polling behavior; and
- credential-safe, operation-aware API errors.

The action node remains split into descriptions, actions, routing, transport,
and payload helpers so each responsibility can be tested independently.

## Credential Boundaries

The package deliberately uses separate credentials:

- **TRMNL Private Plugin API** identifies one documented Private Plugin Webhook
  endpoint by full URL or Plugin Setting UUID.
- **TRMNL Account API** stores the `user_` Bearer key used for Device, Playlist
  Item, and Plugin Setting operations.
- **TRMNL Polling Header Auth API** authenticates inbound requests to the TRMNL
  Trigger.

These credentials are not interchangeable. Private Plugin endpoint handling
must stay restricted to documented TRMNL URLs and UUID shorthand; it must not
become an arbitrary network request surface. Secrets and identifiers must not
appear in logs, fixtures, screenshots, or error messages.

## Compatibility Contract

Saved n8n workflows depend on node and credential names, resource and operation
values, parameter names and defaults, node versions, output shapes, and item
pairing. Preserve those contracts across maintenance releases. A deliberate
breaking or default change requires a new n8n node version and regression
fixtures that prove previously saved workflows retain their behavior.

The package keeps runtime dependencies empty, declares `n8n-workflow` as a peer
dependency, and uses n8n strict mode. Automated compatibility checks cover the
package and node-tooling contract; they do not prove live TRMNL behavior.

## Side-Effect Boundaries

Read operations and Markup Render may be retried deliberately when appropriate.
Writes remain single-attempt by default because repeating them can duplicate or
alter hosted state.

The following surfaces stay outside the 1.0 contract until TRMNL documents a
stable credential, request, response, and side-effect model and live acceptance
confirms it:

- Async Polling callbacks;
- Device Display API operations, including routes that can advance playlist
  state;
- Force Refresh;
- image upload;
- plugin lifecycle operations;
- arbitrary Plugin Setting or Device writes; and
- undocumented playlist mutations.

Adding one of these is a product and security decision, not routine endpoint
wrapping.

## Evidence Model

Keep six claims separate:

1. automated unit/package checks passed;
2. the installed node executed in n8n;
3. TRMNL accepted or stored the change;
4. the hosted preview or portal reflected it; and
5. a physical device displayed or applied it after refresh; and
6. every temporary target, credential, exposure, and hosted mutation was cleaned
   up or restored and independently verified.

A successful HTTP response does not prove the later layers. Mutating acceptance
tests must use disposable or nonessential targets, preserve an exact backup
outside the repository, restore the original state, and verify restoration
independently. See the [manual test matrix](manual-test-matrix.md).

## Release Model

Stable GitHub Releases are the only publication trigger. The tag supplies the
transient npm package version, the workflow validates the tag and package, and
npm Trusted Publishing supplies provenance without a long-lived repository
token. Contributors do not maintain a version-bump commit or changelog.
