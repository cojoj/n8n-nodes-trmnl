# Private Plugin Polling Example

This example shows the Polling strategy supported by the package.

- `polling-workflow.json`: TRMNL calls n8n and receives the last node's root JSON object with HTTP 200.

After importing the workflow:

1. Open **TRMNL Trigger** and copy its production URL into the saved Private Plugin's Polling URL.
2. Match the HTTP verb. For production, select Header Auth and configure the same header name and secret value in n8n and in TRMNL Polling Headers as `Name: Value` (or `name=value`).
3. Activate the workflow. Test URLs only work while n8n is listening; TRMNL should use the production URL.

Your workflow must be active and the production webhook must be publicly reachable over HTTPS for hosted TRMNL to call it. Keep the workflow fast because Polling is synchronous. A rejected header returns 401 before a workflow execution starts, and request headers are never emitted to workflow input.

For release validation, use the Polling and Header Auth cases in
[`docs/manual-test-matrix.md`](../../docs/manual-test-matrix.md) and record n8n,
hosted-render, authentication-rejection, and cleanup evidence separately.
