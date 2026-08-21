# n8n-nodes-trmnl Contributor Rules

This repository contains a programmatic n8n community action node, a Polling
trigger, and three credential types for TRMNL. Before you change product or
security boundaries, read [`docs/architecture.md`](docs/architecture.md).
Before you prepare a pull request, read [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Implementation Shape

- Keep the action node programmatic. Payload validation, operation routing,
  per-item pairing, synchronous Polling, response normalization, and safe error
  handling use explicit control flow. A declarative node hides this control
  flow.
- Keep resource descriptions in `nodes/Trmnl/descriptions/`, execution logic in
  `nodes/Trmnl/actions/`, shared transport behavior in
  `nodes/Trmnl/transport.ts`, and payload helpers in
  `nodes/Trmnl/helpers/`.
- Prefer the official `n8n-node` CLI for build, development, lint, and Cloud
  support checks. Use correct n8n and TypeScript types. Do not suppress lint or
  type errors without a documented reason.
- When you add, remove, or rename nodes or credentials, update the `n8n`
  entrypoints in `package.json`. Also update the package-contract tests.
- Write prose in ASD-STE100 Simplified Technical English. Product names, API
  names, commands, paths, and code identifiers are technical terms.

## Compatibility and Versioning

- Existing node names, credential names, resource and operation values,
  parameter names, defaults, output shapes, and item pairing are saved-workflow
  contracts.
- Do not change those contracts silently. Keep previous behavior or add a new n8n
  node version. Add regression fixtures for workflows that use the old version.
- Use light versioning for one behavior or default change. Use full versioning
  only for a different programmatic implementation.
- Keep `n8n-workflow` as a peer dependency, runtime `dependencies` empty, n8n
  strict mode enabled, and the single pnpm lockfile authoritative.

## Credentials and Security

- Keep the three trust boundaries: Private Plugin Webhook URL/UUID, Account
  API Bearer key, and incoming Polling Header Auth.
- Secret fields must stay masked. Do not log or commit secrets. Do not put
  secrets in errors or fixtures.
- Keep endpoint normalization narrowly scoped to documented TRMNL Private
  Plugin URLs and UUID shorthand. Do not turn credentials into arbitrary URL
  fetchers.
- For external failures, return safe `NodeApiError` results. For local validation
  failures, return `NodeOperationError`. Continue-on-fail output can contain only
  safe operation context.
- Send each write one time by default. Do not add automatic retries to content,
  markup, playlist, or device mutations without an explicit idempotency review.

## Validation and Evidence

Before you request a review, run the applicable subset of:

```bash
pnpm test
pnpm lint
pnpm format:check
pnpm pack --dry-run
pnpm exec n8n-node cloud-support
```

Use `pnpm dev` when you must validate editor or live-service behavior. Use
[`docs/manual-test-matrix.md`](docs/manual-test-matrix.md) for hosted checks.
Report automated checks, n8n execution, hosted state, restoration, and device
checks as different results.

Fixtures must be synthetic and must not contain secrets. Before a test changes
hosted state, create a checkpoint and a complete backup in a secure location.
Do not save the backup in the repository. After the test, restore the backup and
make sure that the state is correct.

## Release Boundary

- Do not change the committed package version or add a changelog. The stable
  GitHub Release tag supplies the published version, and GitHub-generated notes
  are the release history.
- Do not run `n8n-node release` directly or publish locally. The
  guarded `pnpm release` script is for the GitHub Release workflow only.
- Get approval for each operation: commit, push, pull request, merge,
  tag, GitHub Release, and npm publication.
- Use [`docs/releasing.md`](docs/releasing.md) for the release process.
