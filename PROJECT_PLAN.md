# n8n TRMNL Community Node Plan

Research date: 2026-05-31

## What TRMNL Actually Allows

TRMNL devices are pull-based. The device wakes up, asks TRMNL for the next rendered screen, renders the image, then sleeps until the next refresh. An n8n node should therefore not promise instant direct device pushes. The right user-facing model is:

1. n8n sends content to TRMNL.
2. TRMNL renders the private plugin screen.
3. The device displays that screen on its next refresh, according to playlist/device scheduling.

Primary docs:

- https://docs.trmnl.com/go/how-it-works
- https://docs.trmnl.com/go/private-plugins/webhooks
- https://docs.trmnl.com/go/private-api/screens
- https://docs.trmnl.com/go/private-api/account
- https://trmnl.com/api-docs/openapi.yaml

## Recommended Product Shape

Package name: `n8n-nodes-trmnl`

First node: `TRMNL`

Node type: Action node.

Build style: start with a programmatic node, even though the API is REST. The first useful operations need light JSON parsing, payload shaping, payload-size validation, optional item-by-item behavior, and nicer errors around TRMNL rate limits. A declarative node would work for raw endpoint wrapping, but this project should feel polished rather than like a thin HTTP Request preset.

## Shipped Surface Through v0.5.0

### Credentials

The package ships three credential types with separate trust boundaries:

- `TRMNL Private Plugin API`: stores the private plugin webhook URL or UUID and performs a read-only remote credential test.
- `TRMNL Polling Header Auth API`: stores the custom incoming Polling header pair and validates its local format without contacting TRMNL.
- `TRMNL Account API`: stores the `user_...` account API key as a Bearer token for Device, Playlist Item, and Plugin Setting operations.

### Core Operations

Resource: `Private Plugin`

- `Set Content`
  - POST merge variables to the private plugin webhook.
  - Inputs:
    - Webhook URL or UUID from credentials
    - Merge variables as JSON object
    - Merge strategy: Replace, Deep Merge, Stream
    - Stream limit, shown only for Stream
  - Validation:
    - merge variables must be an object
    - fail locally before exceeding the configured payload budget
    - optional TRMNL+ payload budget of 5 KB
  - Output:
    - sent payload
    - TRMNL response
    - payload size

- `Get Content`
  - GET existing merge variables from the private plugin webhook.

Resource: `Markup`

- `Render Markup`
  - POST to `/api/markup`.
  - Lets users test Liquid variables without waiting on device refresh.
  - This is great for workflow debugging and template authors.

### Example Workflows

- RSS or Readwise quote -> TRMNL quote screen.
- Calendar summary -> TRMNL daily agenda.
- Home Assistant metrics -> TRMNL dashboard.
- GitHub issue/PR list -> TRMNL project board.
- Weather + transit + todo merge -> TRMNL morning dashboard.

## Additional Shipped Automation

### Polling Trigger

- `TRMNL Trigger` supplies a synchronous root-JSON response over GET or POST.
- Optional encrypted Header Auth rejects missing, malformed, or wrong values before workflow execution and omits incoming headers from workflow data.

Hosted validation on 2026-08-03 proved synchronous Polling end to end. Hosted Header Auth acceptance passed on 2026-08-09: a matching TRMNL preview request rendered the expected variables, wrong and missing values returned 401 without executions, successful workflow input remained header-free, and the scoped temporary HTTPS exposure and test state were removed afterward.

### Account API Resources

- **Device**: List, Get, and Update Sleep Mode.
- **Playlist Item**: List and Set Visibility.
- **Plugin Setting**: List, Get Details, Get Data, Update Data, Read Markup, and Write Markup.

All writes are single-attempt operations. Hosted state, portal state, and physical-device behavior remain separate evidence layers.

### Explicitly Deferred

- Async Polling until TRMNL documents and validates the callback version contract; hosted experiments returned HTTP 410 `Version mismatch`.
- Device Display API operations because they use a separate credential and `/api/display` advances the playlist.
- Force Refresh because no authenticated endpoint and side-effect contract are documented.
- Image upload, plugin-setting lifecycle operations, arbitrary settings writes, and undocumented playlist mutations.

## UX Principles

- Use TRMNL's GUI terms: Device, Playlist, Private Plugin, Plugin Setting, Merge Variables.
- Make the easy path very small: "Send JSON to Private Plugin."
- Hide conditional fields unless needed, such as the Stream limit and custom payload budget.
- For a Private Plugin endpoint, accept either its UUID or full webhook URL and normalize internally. Account API resources keep the identifier types documented by TRMNL.
- Include clear rate-limit errors: default private plugin webhooks allow 12 requests/hour, TRMNL+ allows 30 requests/hour.
- Be honest in node descriptions: content updates when the TRMNL device next refreshes.

## Technical Plan

The repository uses the official n8n node tooling and keeps a programmatic node because payload validation, response normalization, per-item behavior, synchronous Polling, and operation-aware redacted errors require explicit control flow.

Current release-candidate compatibility check on 2026-08-09:

- Node.js 24.18.1, which satisfies n8n 2.33.7's `>=22.22` engine requirement;
- `@n8n/node-cli` 0.42.2 with strict mode and default ESLint configuration;
- n8n 2.33.7 with published `n8n-nodes-trmnl` 0.5.0 in a clean consumer environment.

Current structure:

- `credentials/TrmnlPrivatePluginApi.credentials.ts`
- `credentials/TrmnlPollingHeaderAuthApi.credentials.ts`
- `credentials/TrmnlAccountApi.credentials.ts`
- `nodes/Trmnl/Trmnl.node.ts`
- `nodes/Trmnl/actions/*.ts`
- `nodes/Trmnl/descriptions/*.ts`
- `nodes/Trmnl/transport.ts`
- `nodes/Trmnl/helpers/payload.ts`

Use `this.helpers.httpRequestWithAuthentication.call(...)` for authenticated account API requests and `this.helpers.httpRequest(...)` for unauthenticated webhook URL/UUID calls. Wrap API failures in `NodeApiError`; wrap local validation problems in `NodeOperationError`.

## Release-Candidate Testing

- Run the full sequential gate: frozen install, `pnpm test`, `pnpm lint`, `pnpm pack --dry-run`, and `pnpm exec n8n-node cloud-support`.
- Install the published or packed candidate into a clean supported n8n environment and import both workflows under `examples/`.
- Complete [docs/manual-test-matrix.md](docs/manual-test-matrix.md), keeping n8n execution, hosted state/rendering, and physical-device display as separate claims.
- Use disposable hosted targets for merge-strategy and markup writes, restore exact original state, and verify cleanup.

## OSS Readiness

- The package declares the `n8n-community-node-package` keyword and strict n8n metadata.
- Built node and credential entrypoints, documentation, and example workflows are packed; tests and TypeScript source are excluded.
- GitHub Actions runs the quality gate and stable GitHub Releases publish to npm through Trusted Publishing with provenance.
- The MIT license, security policy, contribution guide, and generated GitHub release notes are in place.

## Contract Questions Kept Outside 1.0

- Can account API create a new Private Plugin instance cleanly, or does the user still need to create it in the TRMNL UI to get the webhook UUID?
- What is the exact multipart shape for `/api/plugin_settings/:uuid/image`?
- Is there an account API way to force-refresh a plugin setting outside the marketplace return-link flow?
- Does hosted Async Polling require any callback envelope beyond the root JSON object shown by the Private Plugin contract?

## Exact 1.0 Readiness Boundary

1. Validate the packaged candidate on a currently supported Node/n8n combination.
2. Import and exercise both supplied workflows as installed community-package nodes.
3. Complete MT-01 through MT-11 against a disposable Webhook Private Plugin, including stored-state reads, Activity/preview evidence, and the physical-device observation required by MT-11.
4. Restore or remove all temporary workflows, credentials, files, tunnels, and hosted test state, then rerun the full quality gate.

No additional node resource or operation is required for 1.0. Deferred product ideas remain separate future milestones.
