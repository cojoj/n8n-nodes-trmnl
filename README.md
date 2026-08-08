<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="nodes/Trmnl/trmnl.dark.svg">
    <img src="nodes/Trmnl/trmnl.svg" width="88" height="88" alt="TRMNL glyph">
  </picture>
</p>

<h1 align="center">n8n-nodes-trmnl</h1>

<p align="center">
  Connect n8n workflows to TRMNL Private Plugins and read-only Account API resources.
</p>

<p align="center">
  <a href="https://github.com/cojoj/n8n-nodes-trmnl/actions/workflows/ci.yml"><img src="https://github.com/cojoj/n8n-nodes-trmnl/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-171717" alt="MIT license"></a>
</p>

This is an independent n8n community node for sending data to and serving data from [TRMNL](https://trmnl.com/) Private Plugins.

TRMNL devices are pull-based: n8n sends data to TRMNL, TRMNL renders the screen, and the device shows it on the next refresh. This node does not push directly to the hardware.

<!-- npm-release-notes:start -->
<!-- npm-release-notes:end -->

## Project Status

This project is in an MVP state. The core loop has been validated with a real TRMNL Private Plugin and physical TRMNL device:

```text
n8n workflow -> TRMNL node -> Private Plugin webhook -> TRMNL render -> device refresh
```

Polling is the inverse flow: TRMNL calls an active n8n workflow and the workflow supplies the screen data. This path has been validated against hosted TRMNL through the rendered markup preview.

The Account API surface provides read-only Device and Plugin Setting discovery. The three Plugin Setting operations were exercised through local n8n against hosted TRMNL on 2026-08-08 with redacted evidence; repeated GETs left the tested plugin settings, markup, playlist, and device views unchanged. Automated fixtures and hosted acceptance remain tracked separately in [docs/manual-test-matrix.md](docs/manual-test-matrix.md) because a green build alone does not prove live TRMNL behavior.

The node uses TRMNL's official glyphs from its [Brand Assets](https://trmnl.com/brand) page. See [docs/brand-assets.md](docs/brand-assets.md) for provenance. This is an independent community project; TRMNL and n8n are trademarks of their respective owners.

## Installation

Follow n8n's [community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

For local development:

```bash
pnpm install
pnpm dev
```

Then open n8n at `http://localhost:5678`.

If your browser rejects local cookies during development, run:

```bash
N8N_SECURE_COOKIE=false pnpm dev
```

## Quick Start

1. In TRMNL, create a **Private Plugin**.
2. Set **Strategy** to **Webhook**.
3. Save the plugin, then copy its **Webhook URL** or **Plugin UUID**.
4. In n8n, create a **TRMNL Private Plugin API** credential.
5. Add a **TRMNL** node to a workflow.
6. Choose **Private Plugin** -> **Set Content**.
7. Define **Merge Variables** using fields below or a JSON object.
8. Execute the node.

See [docs/getting-started.md](docs/getting-started.md) for the full walkthrough.

## Operations

### TRMNL Trigger

- **Polling Request**: exposes a production webhook URL and returns the first JSON item from the workflow's last node with HTTP 200.

The trigger supports GET or POST and optional **TRMNL Polling Header Auth API** credentials. Configure the same header in TRMNL's Polling Headers. Incoming headers are intentionally not copied into workflow output.

### Device

- **List**: Lists devices in the authenticated TRMNL account.
- **Get**: Gets one device by the numeric ID returned by List.

These read-only Account API operations return TRMNL's documented device data for discovery and administration. They do not use the Device Display API, fetch screen images, advance playlists, push content, or refresh physical hardware.

### Plugin Setting

- **List**: calls `GET /api/plugin_settings` and returns one n8n item per setting when TRMNL supplies a `data` array. The optional **Plugin ID** filter accepts a numeric plugin ID or the documented `calendars` value.
- **Get Details**: gets one setting by its Plugin Setting UUID and preserves the fields TRMNL returns, including available markup sizes when supplied.
- **Get Data**: gets the current data for a setting by numeric ID or UUID without imposing a fixed schema on the returned object.

These operations use the read-only endpoints documented for this release. They do not update plugin data or markup, mutate settings, change playlists, refresh devices, or claim that List is a complete account inventory. Identifiers use normal string fields so expressions can pass them between workflow steps; a dynamic selector is intentionally deferred until live responses prove that later markup identifiers are available.

In the 2026-08-08 hosted acceptance target, List supplied numeric setting and plugin IDs but no Plugin Setting UUID. Get Details accepted a known UUID but did not return that target UUID or an available-markup-size list. These observations are account/setting specific, so the node preserves future response fields without turning them into a fixed selector contract.

### Private Plugin

- **Set Content**: Sends a JSON `merge_variables` object to a TRMNL Private Plugin webhook.
- **Get Content**: Reads the current merge variables from the same webhook endpoint.

`Set Content` accepts full webhook URLs or Plugin Setting UUIDs. UUIDs are normalized to `https://trmnl.com/api/custom_plugins/{uuid}`.

Choose **Using Fields Below** for n8n's native name/value editor with typed values and expressions. Choose **Using JSON** for nested objects, arrays, or pasting a complete payload.

`Set Content` supports TRMNL's webhook merge strategies:

- **Replace**: Replace the stored merge variables.
- **Deep Merge**: Merge nested object values into the current state.
- **Stream**: Append incoming top-level array values and cap retained entries with **Stream Limit**.

When using Stream, send every top-level key that the plugin should retain. Hosted TRMNL can remove stored keys omitted from a Stream update.

The node validates payload size locally before sending. The default limit is 2 KB; TRMNL+ users can raise the node's payload limit to 5 KB.

### Markup

- **Render**: Renders Liquid markup with variables using TRMNL's markup endpoint.

The **Liquid Markup** field is always sent to TRMNL unchanged, so Liquid tags such as `{{ title }}` are not interpreted as n8n expressions. Define dynamic data in **Variables** using n8n's fields editor or a JSON object, then reference those names from the Liquid markup.

When TRMNL returns its rendered result in `data`, the node exposes that value as top-level `rendered` for convenient downstream use. The complete TRMNL response remains available under `response`.

## Example

The repository includes a verified Webhook dashboard and Polling workflow examples:

- [examples/private-plugin-dashboard/markup-full.liquid](examples/private-plugin-dashboard/markup-full.liquid)
- [examples/private-plugin-dashboard/payload.json](examples/private-plugin-dashboard/payload.json)
- [examples/private-plugin-dashboard/workflow.json](examples/private-plugin-dashboard/workflow.json)
- [examples/private-plugin-dashboard/README.md](examples/private-plugin-dashboard/README.md)
- [examples/private-plugin-polling/README.md](examples/private-plugin-polling/README.md)

Use this as the first smoke test after installing the node.

## Credentials

### TRMNL Private Plugin API

Use the Webhook URL from a saved Private Plugin, or paste only the Plugin Setting UUID. The credential test performs a read-only `GET` against the Webhook endpoint.

TRMNL's webhook docs: https://docs.trmnl.com/go/private-plugins/webhooks

### TRMNL Polling Header Auth API

Stores the header name and secret value used to authenticate incoming Polling requests. Put the same pair in the Private Plugin's Polling Headers. Because TRMNL initiates this request, credential testing validates the local configuration; the live request is proven only when TRMNL calls an active, public HTTPS workflow.

### TRMNL Account API

Stores a `user_` TRMNL Account API key for authenticated API features. TRMNL requires a developer license for this API. Use it with **Device** -> **List** or **Get**, and **Plugin Setting** -> **List**, **Get Details**, or **Get Data**, for read-only account discovery.

The Device Display API/BYOD endpoints (`/api/display`, `/api/current_screen`, and other screen-image retrieval routes) use a different credential boundary and remain out of scope. Private Plugin webhooks remain the supported content-update path in this node, and device refresh remains pull/check-in based.

See the [Account API roadmap](docs/account-api-roadmap.md) for the implemented discovery slice and the separately scoped write, playlist, and device work.

TRMNL account API docs: https://docs.trmnl.com/go/private-api/account

## Development Checks

```bash
pnpm test
pnpm lint
pnpm pack --dry-run
```

This project keeps n8n strict mode enabled for community-node compatibility.

Use [docs/manual-test-matrix.md](docs/manual-test-matrix.md) for live release-candidate checks across n8n, the Private Plugin webhook, TRMNL Activity/preview, and a physical device.

## Device Refresh Behavior

The webhook updates TRMNL's server-side data. The physical device updates when it checks in and asks TRMNL for content.

For development, use **Force Refresh** on the TRMNL plugin settings page, then wait for the device's next check-in or use the device controls according to TRMNL's refresh behavior.

## Resources

- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [TRMNL API docs](https://docs.trmnl.com/go)
- [TRMNL Private Plugin webhook docs](https://docs.trmnl.com/go/private-plugins/create-a-screen)
- [TRMNL refresh behavior](https://help.trmnl.com/en/articles/10113695-how-refresh-rates-work)
- [TRMNL OpenAPI spec](https://trmnl.com/api-docs/openapi.yaml)
- [n8n creating nodes docs](https://docs.n8n.io/integrations/creating-nodes/overview/)
- [n8n community nodes docs](https://docs.n8n.io/integrations/community-nodes/)
- [Maintainer release process](docs/releasing.md)
