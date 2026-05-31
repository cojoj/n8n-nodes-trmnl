# n8n-nodes-trmnl

This is an n8n community node for sending workflow data to [TRMNL](https://trmnl.com/) Private Plugins.

TRMNL devices are pull-based: n8n sends data to TRMNL, TRMNL renders the screen, and the device shows it on the next refresh. This node does not push directly to the hardware.

## Installation

Follow n8n's [community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

For local development:

```bash
npm install
npm run dev
```

Then open n8n at `http://localhost:5678`.

## Operations

### Private Plugin

- **Set Content**: Sends a JSON `merge_variables` object to a TRMNL Private Plugin webhook.
- **Get Content**: Reads the current merge variables from the same webhook endpoint.

`Set Content` accepts full webhook URLs or Plugin Setting UUIDs. UUIDs are normalized to `https://trmnl.com/api/custom_plugins/{uuid}`.

### Markup

- **Render**: Renders Liquid markup with variables using TRMNL's markup endpoint.

## Credentials

### TRMNL Private Plugin API

Use the Webhook URL from a saved TRMNL Private Plugin, or paste only the Plugin Setting UUID.

TRMNL's webhook docs: https://docs.trmnl.com/go/private-plugins/webhooks

### TRMNL Account API

Stores a TRMNL account API key for authenticated API features. The first MVP registers this credential for future account/device/plugin-setting operations.

TRMNL account API docs: https://docs.trmnl.com/go/private-api/account

## Development Checks

```bash
npm test
npm run build
npm run lint
```

This project keeps n8n strict mode enabled for community-node compatibility.

## Resources

- [TRMNL API docs](https://docs.trmnl.com/go)
- [TRMNL OpenAPI spec](https://trmnl.com/api-docs/openapi.yaml)
- [n8n creating nodes docs](https://docs.n8n.io/integrations/creating-nodes/overview/)
- [n8n community nodes docs](https://docs.n8n.io/integrations/community-nodes/)
