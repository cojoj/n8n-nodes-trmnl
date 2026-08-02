# Getting Started

This guide walks through the first useful TRMNL automation: sending n8n workflow data to a TRMNL Private Plugin.

## What This Node Does

`n8n-nodes-trmnl` sends JSON to TRMNL. TRMNL renders your Private Plugin markup, then your TRMNL device fetches the rendered screen on its next refresh or check-in.

It does not directly push pixels to the physical device.

## Create a TRMNL Private Plugin

1. Open TRMNL.
2. Go to **Plugins**.
3. Create a **Private Plugin**.
4. Set **Strategy** to **Webhook**.
5. Save the plugin.
6. Copy the **Webhook URL** or **Plugin UUID**.

The webhook URL looks like:

```text
https://trmnl.com/api/custom_plugins/your-plugin-uuid
```

## Add Markup

In TRMNL, open **Edit Markup** for your Private Plugin and paste the example markup:

```text
examples/private-plugin-dashboard/markup-full.liquid
```

TRMNL markup uses Liquid variables, so an n8n merge variable named `title` appears as:

```liquid
{{ title }}
```

## Create n8n Credentials

1. In n8n, open **Credentials**.
2. Create **TRMNL Private Plugin API**.
3. Paste either the full Webhook URL or only the Plugin UUID.
4. Save the credential.

The credential test performs a `GET` request to the Private Plugin webhook endpoint.

## Build the Workflow

Option A: import the example workflow.

1. Import `examples/private-plugin-dashboard/workflow.json`.
2. Open the TRMNL node.
3. Select your **TRMNL Private Plugin API** credential.
4. Execute the TRMNL node.

Option B: build it manually.

1. Create a workflow.
2. Add **Manual Trigger**.
3. Add **TRMNL**.
4. Choose **Private Plugin**.
5. Choose **Set Content**.
6. Select your **TRMNL Private Plugin API** credential.
7. Paste `examples/private-plugin-dashboard/payload.json` into **Merge Variables**.
8. Execute the TRMNL node.

Expected output:

```json
{
  "success": true,
  "payloadSizeBytes": 238,
  "mergeStrategy": "replace"
}
```

## Merge Strategies

The default strategy replaces the stored merge variables.

Use **Deep Merge** when you want to update nested values without replacing the whole object.

Use **Stream** when you want TRMNL to append incoming top-level array values and retain only the latest entries according to **Stream Limit**.

## Payload Limits

TRMNL Private Plugin webhooks have a small payload budget. This node fails locally before sending if the request body is over the configured byte limit.

Defaults:

- Regular TRMNL: `2048` bytes
- TRMNL+: `5120` bytes

## Device Refresh

After n8n sends data, the TRMNL web preview updates first. The physical device updates when it asks TRMNL for content.

For testing, use **Force Refresh** from the plugin settings page, then wait for the device's next check-in or use the device controls according to TRMNL's refresh rules.
