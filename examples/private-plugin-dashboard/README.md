# Private Plugin Dashboard Example

This example is the smallest verified loop for `n8n-nodes-trmnl`:

1. n8n sends JSON merge variables to a TRMNL Private Plugin webhook.
2. TRMNL renders the Liquid markup.
3. The device shows the screen on its next refresh or check-in.

## TRMNL Setup

1. In TRMNL, create a Private Plugin.
2. Set **Strategy** to **Webhook**.
3. Save the plugin.
4. Open **Edit Markup**.
5. Paste `markup-full.liquid` into the **Full** layout.
6. Save the markup.
7. Copy the plugin's **Webhook URL** or **Plugin UUID**.

## n8n Setup

1. Create a credential of type **TRMNL Private Plugin API**.
2. Paste the TRMNL Webhook URL or Plugin UUID.
3. Import `workflow.json` or create a workflow with **Manual Trigger** followed by **TRMNL**.
4. Select your credential on the TRMNL node after import.
5. Select **Private Plugin** and **Set Content** if building manually.
6. Paste `payload.json` into **Merge Variables** if building manually.
7. Execute the TRMNL node.

The TRMNL node output should include `success: true` and the byte size of the request body.

## Refreshing the Device

TRMNL devices are pull-based. The webhook updates TRMNL's server-side data, not the physical device directly.

For testing, use **Force Refresh** on the TRMNL plugin settings page, then wait for the device's next check-in or press the device button according to TRMNL's refresh behavior.
