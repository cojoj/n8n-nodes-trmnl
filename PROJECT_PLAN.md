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

## MVP

### Credentials

Create two credential types, or one credential type with an auth-mode selector:

- `TRMNL Private Plugin`: stores the private plugin webhook URL or UUID. This supports the core "push content" workflow without requiring a user API key.
- `TRMNL Account API`: stores the `user_...` account API key as a Bearer token. This powers optional account/device/plugin management operations.

MVP should start with `TRMNL Private Plugin` only if we want the fastest usable release.

### Core Operations

Resource: `Private Plugin`

- `Set Content`
  - POST merge variables to the private plugin webhook.
  - Inputs:
    - Webhook URL or UUID from credentials
    - Merge variables as JSON object
    - Merge strategy: Replace, Deep Merge, Stream
    - Stream limit, shown only for Stream
    - Simplify output toggle
  - Validation:
    - merge variables must be an object
    - warn or fail before exceeding 2 KB default payload budget
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

### Nice MVP Workflows

- RSS or Readwise quote -> TRMNL quote screen.
- Calendar summary -> TRMNL daily agenda.
- Home Assistant metrics -> TRMNL dashboard.
- GitHub issue/PR list -> TRMNL project board.
- Weather + transit + todo merge -> TRMNL morning dashboard.

## Post-MVP

Resource: `Account`

- `Get Me`
- `List Devices`
- `Get Device`
- `Update Device Sleep Mode`

Resource: `Device Display`

- `Get Current Screen`
- `Get Next Screen`

These should be presented carefully because `/api/display` advances the playlist. `Get Current Screen` is safer; `Get Next Screen` should carry a strong description that it advances content.

Resource: `Plugin Setting`

- `List Plugin Settings`
- `Get Plugin Setting Data`
- `Update Plugin Setting Data`
- `Read Markup`
- `Write Markup`
- `Update Settings`

Resource: `Playlist`

- `List Playlist Items`
- `Set Playlist Item Visibility`

Potential later resource: `Image Plugin`

- Upload an image for a `webhook_image` plugin, if we can verify request shape and constraints against a real account.

## UX Principles

- Use TRMNL's GUI terms: Device, Playlist, Private Plugin, Plugin Setting, Merge Variables.
- Make the easy path very small: "Send JSON to Private Plugin."
- Hide advanced fields unless needed: merge strategy, stream limit, payload budget, raw response.
- For IDs, accept either UUID or full webhook URL and normalize internally.
- Include clear rate-limit errors: default private plugin webhooks allow 12 requests/hour, TRMNL+ allows 30 requests/hour.
- Be honest in node descriptions: content updates when the TRMNL device next refreshes.

## Technical Plan

Scaffold with the official n8n node tooling:

```bash
npm create @n8n/node@latest n8n-nodes-trmnl -- --template programmatic/example
```

Current versions checked on 2026-05-31:

- `@n8n/create-node`: 0.31.1
- `@n8n/node-cli`: 0.32.1
- `n8n`: 2.22.5

Expected structure:

- `credentials/TrmnlPrivatePluginApi.credentials.ts`
- `credentials/TrmnlAccountApi.credentials.ts`
- `nodes/Trmnl/Trmnl.node.ts`
- `nodes/Trmnl/actions/privatePlugin/*.ts`
- `nodes/Trmnl/actions/markup/*.ts`
- `nodes/Trmnl/transport/index.ts`
- `nodes/Trmnl/helpers/payload.ts`

Use `this.helpers.httpRequestWithAuthentication.call(...)` for authenticated account API requests and `this.helpers.httpRequest(...)` for unauthenticated webhook URL/UUID calls. Wrap API failures in `NodeApiError`; wrap local validation problems in `NodeOperationError`.

## Testing Plan

- Unit-test payload normalization:
  - webhook URL -> UUID or endpoint
  - UUID -> endpoint
  - merge variables JSON validation
  - payload byte-size limits
- Unit-test operation routing with mocked HTTP responses.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run dev` and test inside local n8n at `localhost:5678`.
- Add manual test workflows under `examples/`.

## OSS Readiness

- Add `n8n-community-node-package` keyword.
- Configure `package.json` `n8n` metadata with node and credential paths.
- Add README with screenshots, setup instructions, and example workflows.
- Add MIT license unless there is a reason to choose otherwise.
- Add GitHub Actions for lint/build/test.
- For n8n verification, publish to npm through GitHub Actions with provenance.

## Open Questions To Validate

- Does the webhook endpoint now prefer `/api/custom_plugins/:uuid` or `/api/plugin_settings/:uuid/data`, or are both supported? Docs show the former; OpenAPI shows the latter.
- Can account API create a new Private Plugin instance cleanly, or does the user still need to create it in the TRMNL UI to get the webhook UUID?
- What is the exact multipart shape for `/api/plugin_settings/:uuid/image`?
- Is there an account API way to force-refresh a plugin setting outside the marketplace return-link flow?
- What response body do private plugin webhook POSTs return in practice?

## Opinionated Roadmap

1. Ship a tight MVP around Private Plugin webhooks and Markup rendering.
2. Add account/device listing for convenience.
3. Add plugin setting markup management so advanced users can update templates from n8n.
4. Add image upload once verified.
5. Publish recipes/examples and make the repo genuinely useful to other TRMNL users.
