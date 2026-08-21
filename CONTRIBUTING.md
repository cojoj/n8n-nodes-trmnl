# Contributing

Thank you for your work on `n8n-nodes-trmnl`. You can contribute small bug
fixes, tests, documentation changes, and node operations.

## Before You Start

- For a small bug fix or documentation change, open a pull request.
- Before you add a resource, operation, credential type, breaking change, or
  runtime dependency, open an issue.
- For a security problem, use [SECURITY.md](SECURITY.md). Do not use a public
  issue.

## Development Setup

Use the current Node.js LTS release and the pnpm version declared in
`package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm format:check
```

`pnpm test` builds before it starts the tests. For a package change, also
examine the published file set:

```bash
pnpm pack --dry-run
```

Use `pnpm dev` for editor or live-service validation.

## Project Boundaries

- Keep saved-workflow contracts. Before a breaking change, agree on the change
  and add a node version.
- Keep runtime `dependencies` empty, `n8n-workflow` as a peer dependency, and
  the pnpm lockfile authoritative.
- Keep credentials in their specified scope. Keep secret fields masked. Do not
  log or commit credentials, Webhook URLs, API keys, header values, or account
  data.
- Do not change the package version or add a changelog. Releases derive their
  version and notes from GitHub.

## Dependency Maintenance

Examine the toolchain with:

```bash
pnpm outdated
pnpm audit
```

Keep each dependency change small. Examine the manifest and lockfile changes.
Remove overrides that are not necessary. Run all package checks. Examine major
updates and security fixes in different pull requests.

## Tests and Fixtures

Add tests for behavior changes. Keep request assertions and response assertions
in different tests. Fixtures must be synthetic and must not contain secrets.

For credentials, requests, rendering, Polling, or device behavior, run the
applicable [manual test cases](docs/manual-test-matrix.md). Automated tests do
not prove hosted or physical-device behavior.

## Pull Requests

Keep each pull request small. Give this information:

- What changed and why
- Effects on workflows or credentials
- Automated check results
- Live check results, or a statement that live checks were not necessary

Do not commit generated `dist/` output. Run the applicable automated and manual
checks before you request a review.
