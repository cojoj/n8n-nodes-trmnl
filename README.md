<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cojoj/n8n-nodes-trmnl/main/nodes/Trmnl/trmnl.dark.svg">
    <img src="https://raw.githubusercontent.com/cojoj/n8n-nodes-trmnl/main/nodes/Trmnl/trmnl.svg" width="88" height="88" alt="TRMNL glyph">
  </picture>
</p>

<h1 align="center">n8n-nodes-trmnl</h1>

<p align="center">
  Connect n8n workflows to TRMNL Private Plugins and Account API resources.
</p>

<p align="center">
  <a href="https://github.com/cojoj/n8n-nodes-trmnl/actions/workflows/ci.yml"><img src="https://github.com/cojoj/n8n-nodes-trmnl/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://github.com/cojoj/n8n-nodes-trmnl/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-171717" alt="MIT license"></a>
</p>

This independent n8n community package sends workflow data to TRMNL, serves
Polling responses, and manages a focused set of Account API resources. TRMNL
devices are pull-based: server-side content changes appear on the physical
device on a later refresh or check-in, not as an immediate push.

The project prioritizes compatibility, release validation, documentation, and
repository quality over expanding the operation surface. See the
[architecture decisions](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/architecture.md)
for the durable product and safety boundaries.

## Install

On a self-hosted n8n instance, open **Settings → Community Nodes**, choose
**Install**, and enter the exact package name:

```text
n8n-nodes-trmnl
```

Follow n8n's [community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
for instance requirements and alternative installation methods. After
installation, search for **TRMNL** or **TRMNL Trigger** in the node picker.

## Nodes and Operations

<!-- prettier-ignore -->
| Node | Resource | Operations |
| --- | --- | --- |
| TRMNL | Private Plugin | Set Content, Get Content |
| TRMNL | Markup | Render |
| TRMNL | Device | List, Get, Update Sleep Mode |
| TRMNL | Playlist Item | List, Set Visibility |
| TRMNL | Plugin Setting | List, Get Details, Get Data, Update Data, Read Markup, Write Markup |
| TRMNL Trigger | Polling | GET or POST, with optional Header Auth |

No action retries automatically. Use n8n's **Retry On Fail** deliberately for
transient reads or Markup Render, and review write side effects before enabling
it for Set Content, Set Visibility, Update Sleep Mode, Update Data, or Write
Markup.

## Credentials

- **TRMNL Private Plugin API** stores a saved Private Plugin Webhook URL or its
  Plugin Setting UUID. Use it for Private Plugin Set/Get Content.
- **TRMNL Account API** stores a `user_` Account API key. TRMNL requires a
  developer license for this API. Use it for Device, Playlist Item, and
  compatible Plugin Setting operations. A Webhook Private Plugin uses Private
  Plugin Set/Get Content instead of Account API Update/Get Data.
- **TRMNL Polling Header Auth API** stores the custom header name and value used
  to authenticate incoming Polling requests. Configure the same pair in TRMNL.

These credentials are intentionally separate trust boundaries. Do not use an
Account API key where a Private Plugin endpoint is expected, and do not expose
Polling without authentication unless the workflow is deliberately public.

## Quick Start: Webhook Content

1. In TRMNL, create a Private Plugin with the **Webhook** strategy.
2. Paste [the example Liquid markup](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/examples/private-plugin-dashboard/markup-full.liquid)
   into its Full layout.
3. Create a **TRMNL Private Plugin API** credential in n8n.
4. Import [the Webhook example workflow](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/examples/private-plugin-dashboard/workflow.json).
5. Select the credential on the TRMNL node and execute it.
6. Confirm the stored data and preview in TRMNL, then wait for the device's next
   refresh if physical-device delivery matters.

The example's [README](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/examples/private-plugin-dashboard/README.md) explains the
smallest verified setup. Use **Using Fields Below** for simple typed values and
expressions, or **Using JSON** for nested objects and arrays.

## Polling

Import [the Polling example](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/examples/private-plugin-polling/polling-workflow.json),
activate it, and paste the TRMNL Trigger's production URL into the Private
Plugin's Polling URL. The production webhook must be publicly reachable over
HTTPS, the HTTP verb must match, and the workflow should stay fast because the
response is synchronous.

Header Auth is recommended. Enter the same pair in TRMNL Polling Headers as
`Name: Value` or `name=value`. Rejected credentials return HTTP 401 before a
workflow execution begins, and incoming headers are not copied into workflow
data.

## Compatibility

- The package uses n8n strict community-node metadata and the official
  `@n8n/node-cli` toolchain.
- CI runs the full build and test suite on Node.js 22 and the current LTS release.
- A scheduled compatibility workflow tests the package against the latest
  `n8n-workflow` runtime and node tooling without modifying the repository or
  publishing anything.
- Existing node names, credential names, parameter names, and saved workflow
  behavior are compatibility contracts. Breaking behavior requires explicit
  node versioning and regression coverage.

Exact tool versions are declared in `package.json` and `pnpm-lock.yaml`. A green
automated build proves package behavior, not hosted TRMNL state, rendered UI, or
physical-device delivery; use the
[manual test matrix](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/manual-test-matrix.md)
for those boundaries.

## Development

Use the Node.js LTS release and pnpm version declared by the repository:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm format:check
pnpm pack --dry-run
pnpm exec n8n-node cloud-support
```

Run `pnpm dev` for local n8n editor validation. Do not commit generated `dist/`
output, bump the package version, create a changelog, or run a local release.
Stable GitHub Releases are the only publication trigger; see the
[maintainer release process](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/releasing.md).

## Project Links

- [Architecture and safety boundaries](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/architecture.md)
- [Contributing](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/CONTRIBUTING.md)
- [Security policy](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/SECURITY.md)
- [Manual release-candidate checks](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/manual-test-matrix.md)
- [Webhook example](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/examples/private-plugin-dashboard/README.md)
- [Polling example](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/examples/private-plugin-polling/README.md)
- [Brand asset provenance](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/brand-assets.md)
- [TRMNL API documentation](https://docs.trmnl.com/go)
- [TRMNL OpenAPI specification](https://trmnl.com/api-docs/openapi.yaml)
- [n8n community-node documentation](https://docs.n8n.io/integrations/community-nodes/)

TRMNL and n8n are trademarks of their respective owners. This project is not
endorsed by or affiliated with either company.
