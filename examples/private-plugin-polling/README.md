# Private Plugin Polling Examples

This example shows the Polling strategy supported by the package.

- `polling-workflow.json`: TRMNL calls n8n and receives the last node's root JSON object with HTTP 200.

After importing the workflow:

1. Open **TRMNL Trigger** and copy its production URL into the saved Private Plugin's Polling URL.
2. Match the HTTP verb. For production, select Header Auth and configure the same encrypted header value in n8n and TRMNL.
3. Activate the workflow. Test URLs only work while n8n is listening; TRMNL should use the production URL.

Your n8n webhook must be publicly reachable over HTTPS for hosted TRMNL to call it.

The synchronous Polling example passed a hosted end-to-end test on 2026-08-03.
