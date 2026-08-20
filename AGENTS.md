# n8n-nodes-trmnl Contributor Rules

This repository contains a programmatic n8n community action node, a Polling
trigger, and three credential types for TRMNL. Read
[`docs/architecture.md`](docs/architecture.md) before changing product or
security boundaries and [`CONTRIBUTING.md`](CONTRIBUTING.md) before preparing a
pull request.

## Implementation Shape

- Keep the action node programmatic. Payload validation, operation routing,
  per-item pairing, synchronous Polling, response normalization, and redacted
  error handling require explicit control flow that a declarative node would
  obscure.
- Keep resource descriptions in `nodes/Trmnl/descriptions/`, execution logic in
  `nodes/Trmnl/actions/`, shared transport behavior in
  `nodes/Trmnl/transport.ts`, and payload helpers in
  `nodes/Trmnl/helpers/`.
- Prefer the official `n8n-node` CLI for build, development, lint, and Cloud
  support checks. Use proper n8n and TypeScript types; do not silence lint or
  type errors without a specific documented reason.
- If nodes or credentials are added, removed, or renamed, update the `n8n`
  entrypoints in `package.json` and the package-contract tests together.

## Compatibility and Versioning

- Existing node names, credential names, resource and operation values,
  parameter names, defaults, output shapes, and item pairing are saved-workflow
  contracts.
- Do not change those contracts silently. Preserve old behavior or introduce a
  new n8n node version with regression fixtures for workflows saved against the
  previous version.
- Prefer light versioning for a focused behavior/default change. Consider full
  versioning only for a genuinely separate programmatic implementation.
- Keep `n8n-workflow` as a peer dependency, runtime `dependencies` empty, n8n
  strict mode enabled, and the single pnpm lockfile authoritative.

## Credentials and Security

- Preserve the three trust boundaries: Private Plugin Webhook URL/UUID, Account
  API Bearer key, and incoming Polling Header Auth.
- Secret fields must remain masked. Never log, commit, echo in errors, or place
  in fixtures any API key, webhook URL, Plugin Setting UUID, Polling header,
  account data, device identifier, or workflow credential.
- Keep endpoint normalization narrowly scoped to documented TRMNL Private
  Plugin URLs and UUID shorthand. Do not turn credentials into arbitrary URL
  fetchers.
- External failures must remain credential-safe `NodeApiError` results; local
  validation failures remain `NodeOperationError`. Continue-on-fail output may
  contain only redacted operation context.
- Writes are single-attempt by default. Do not add automatic retries to content,
  markup, playlist, or device mutations without an explicit idempotency review.

## Validation and Evidence

Before requesting review, run the relevant subset of:

```bash
pnpm test
pnpm lint
pnpm format:check
pnpm pack --dry-run
pnpm exec n8n-node cloud-support
```

Use `pnpm dev` when editor or live-service behavior needs validation. Follow
[`docs/manual-test-matrix.md`](docs/manual-test-matrix.md) for hosted checks.
Report automated/package evidence separately from n8n execution, hosted TRMNL
state or preview, restoration, and physical-device evidence.

Fixtures must be synthetic and redacted. Any test that mutates hosted state
requires an explicit checkpoint, an exact backup outside the repository, and
independent restoration verification.

## Release Boundary

- Do not bump the committed package version or add a changelog. The stable
  GitHub Release tag supplies the published version, and GitHub-generated notes
  are the release history.
- Do not run `n8n-node release` directly or attempt local publication. The
  guarded `pnpm release` script is for the GitHub Release workflow only.
- Commit, push, pull request, merge, tag, GitHub Release, and npm publication are
  separate approval boundaries. Never expand implementation work into one of
  those actions without explicit authorization.
- The canonical process is documented in
  [`docs/releasing.md`](docs/releasing.md).
