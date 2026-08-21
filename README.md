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

This n8n community package sends workflow data to TRMNL. It also supplies
Polling responses and manages the Account API resources in the table below. A
TRMNL device gets new content during a refresh or check-in. It does not get a
push at that time.

## Install

On a self-hosted n8n instance, open **Settings → Community Nodes**. Select
**Install**. Type this package name:

```text
n8n-nodes-trmnl
```

The n8n [community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
gives instance requirements and other installation methods. After the
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

Action operations do not have automatic retries. Use **Retry On Fail** only for
temporary read errors or Markup Render. Before you use it for a write operation,
examine the possible side effects.

## Credentials

- **TRMNL Private Plugin API** stores a saved Private Plugin Webhook URL or its
  Plugin Setting UUID. Use it for Private Plugin Set/Get Content.
- **TRMNL Account API** stores a `user_` Account API key. TRMNL requires a
  developer license for this API. Use it for Device, Playlist Item, and
  compatible Plugin Setting operations. Use Private Plugin Set/Get Content for
  a Webhook Private Plugin. Do not use Account API Update/Get Data for it.
- **TRMNL Polling Header Auth API** stores the custom header name and value used
  to authenticate incoming Polling requests. Configure the same pair in TRMNL.

Each credential has a different trust boundary. Do not use a credential for a
different trust boundary. Use Polling without authentication only when you
intentionally make it public.

## Quick Start: Webhook Content

1. In TRMNL, create a Private Plugin with the **Webhook** strategy.
2. Create a **TRMNL Private Plugin API** credential in n8n.
3. Add a TRMNL node. Select **Private Plugin** and **Set Content**. Select
   the credential.
4. Add merge variables with **Using Fields Below**, or use **Using JSON** for
   nested objects and arrays.
5. Execute the node. Use those variable names in the Private Plugin Liquid
   markup.
6. Make sure that TRMNL contains the data and shows the preview. For a device
   check, wait for the next refresh.

## Polling

Add a **TRMNL Trigger**. Connect it to a workflow that returns one root JSON
object. Activate the workflow. Copy the production URL to the Private Plugin
Polling URL.

The production webhook must be public through HTTPS. The HTTP verb must be the
same in TRMNL and n8n. The workflow must send the response quickly because the
operation is synchronous.

Use Header Auth. Type the same pair in TRMNL Polling Headers as `Name: Value` or
`name=value`. Incorrect credentials return HTTP 401 before the workflow starts.
The workflow data does not contain the incoming headers.

## Compatibility

Existing node names, credential names, parameters, versions, and saved-workflow
behavior are compatibility contracts. CI tests Node.js 22 and the current LTS.
A scheduled workflow checks the latest n8n runtime and tools.

Automated checks do not prove hosted TRMNL or physical-device behavior. Use the
[manual test matrix](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/manual-test-matrix.md)
for live validation.

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
output. Do not change the package version. Only a stable GitHub Release starts
publication. Refer to the
[maintainer release process](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/releasing.md).

## Project Links

- [Architecture](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/architecture.md)
- [Contributing](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/CONTRIBUTING.md)
- [Security policy](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/SECURITY.md)
- [Manual test matrix](https://github.com/cojoj/n8n-nodes-trmnl/blob/main/docs/manual-test-matrix.md)
- [TRMNL API documentation](https://docs.trmnl.com/go)
- [n8n community-node documentation](https://docs.n8n.io/integrations/community-nodes/)

TRMNL and n8n own their trademarks. They do not endorse this project.
