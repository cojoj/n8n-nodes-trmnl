<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="nodes/Trmnl/trmnl.dark.svg">
    <img src="nodes/Trmnl/trmnl.svg" width="88" height="88" alt="TRMNL glyph">
  </picture>
</p>

<h1 align="center">n8n-nodes-trmnl</h1>

<p align="center">
  Send n8n workflow data to TRMNL Private Plugins.
</p>

<p align="center">
  <a href="https://github.com/cojoj/n8n-nodes-trmnl/actions/workflows/ci.yml"><img src="https://github.com/cojoj/n8n-nodes-trmnl/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-171717" alt="MIT license"></a>
</p>

This is an independent n8n community node for sending workflow data to [TRMNL](https://trmnl.com/) Private Plugins.

TRMNL devices are pull-based: n8n sends data to TRMNL, TRMNL renders the screen, and the device shows it on the next refresh. This node does not push directly to the hardware.

## Project Status

This project is in an MVP state. The core loop has been validated with a real TRMNL Private Plugin and physical TRMNL device:

```text
n8n workflow -> TRMNL node -> Private Plugin webhook -> TRMNL render -> device refresh
```

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

The repository includes a small verified dashboard example:

- [examples/private-plugin-dashboard/markup-full.liquid](examples/private-plugin-dashboard/markup-full.liquid)
- [examples/private-plugin-dashboard/payload.json](examples/private-plugin-dashboard/payload.json)
- [examples/private-plugin-dashboard/workflow.json](examples/private-plugin-dashboard/workflow.json)
- [examples/private-plugin-dashboard/README.md](examples/private-plugin-dashboard/README.md)

Use this as the first smoke test after installing the node.

## Credentials

### TRMNL Private Plugin API

Use the Webhook URL from a saved TRMNL Private Plugin configured with the **Webhook** strategy, or paste only the Plugin Setting UUID. The credential test applies the same URL/UUID normalization as Private Plugin node operations and performs a read-only `GET` request.

TRMNL's webhook docs: https://docs.trmnl.com/go/private-plugins/webhooks

### TRMNL Account API

Stores a `user_` TRMNL Account API key for authenticated API features. TRMNL requires a developer license for this API. No current node operation uses this credential; it remains registered for future account, device, and plugin-management operations.

See the [Account API roadmap](docs/account-api-roadmap.md) for the proposed read-only discovery, plugin-setting content, playlist, and device slices.

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

- [TRMNL API docs](https://docs.trmnl.com/go)
- [TRMNL Private Plugin webhook docs](https://docs.trmnl.com/go/private-plugins/create-a-screen)
- [TRMNL refresh behavior](https://help.trmnl.com/en/articles/10113695-how-refresh-rates-work)
- [TRMNL OpenAPI spec](https://trmnl.com/api-docs/openapi.yaml)
- [n8n creating nodes docs](https://docs.n8n.io/integrations/creating-nodes/overview/)
- [n8n community nodes docs](https://docs.n8n.io/integrations/community-nodes/)
