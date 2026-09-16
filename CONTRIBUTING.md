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

Use Node.js 26 and the pnpm version declared in `package.json`. If you use mise,
run `mise install` to install the versions in `mise.lock`. CI also checks the
current Node.js LTS release and Node.js 22. Publishing uses the current LTS.

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

The `Dependency Security` workflow audits the committed lockfile and a temporary
lockfile with the latest n8n runtime and tooling. It runs on pull requests, pushes
to `main`, and each day. High and critical findings fail the audit. Registry
errors also fail the audit; they do not count as a successful security check.
The daily compatibility workflow reports build, test, and lint results. CI also
keeps its existing audit step so its security gate stays in place.

Run `pnpm audit` without a severity filter to examine all findings. Do not force
a transitive dependency across major versions only to clear an advisory.

### Open upstream advisory

As of 2026-09-16, the development toolchain includes `stream-json@1.9.1` through
`@n8n/node-cli` and `@n8n/backend-common`. This version is reported by
[GHSA-528h-pc64-c93x](https://github.com/advisories/GHSA-528h-pc64-c93x)
at moderate severity. The fixed release is 3.5.0. There is no patched 1.x release.

In the committed dependency tree, `@n8n/backend-common` uses the parser and
`Assembler` in `utils/flatted-async.js`. It does not use the affected path
filters. The TRMNL package has no runtime dependencies and does not pack this
development toolchain. Keep the advisory visible. Recheck the dependency path
and API use when n8n tooling changes, and update when a compatible fix is
available.

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
