# Contributing

Thanks for helping improve `n8n-nodes-trmnl`. Focused bug fixes, tests,
documentation improvements, and well-scoped node operations are welcome.

## Before You Start

- Open a pull request directly for a small bug fix or documentation change.
- Open an issue before implementing a new resource, operation, credential type,
  breaking workflow change, or runtime dependency.
- Report security vulnerabilities privately as described in
  [SECURITY.md](SECURITY.md), not in a public issue.

## Development Setup

Use the current Node.js LTS release and the pnpm version declared in
`package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm lint
```

`pnpm test` builds the package before running the automated tests. Before
submitting a packaging change, also inspect the published file set:

```bash
pnpm pack --dry-run
```

Use `pnpm dev` when a change needs validation in the n8n editor or against a
live TRMNL service.

## Project Boundaries

- Preserve existing node names, parameter names, credential names, and node
  versions unless a breaking change has been discussed first.
- Keep `dependencies` empty. This project deliberately avoids runtime
  dependencies to preserve its lean package and n8n Cloud eligibility.
- Keep `n8n-workflow` as a peer dependency and preserve the single pnpm
  lockfile.
- Keep credentials narrowly scoped. Secret fields must stay masked, and
  credentials, webhook URLs, API keys, header values, or account data must
  never be logged or committed.
- Do not bump the package version in a normal contribution. Version and
  changelog changes belong to release preparation.

## Tests and Fixtures

Add or update automated coverage for behavior changes. Keep request assertions
separate from response assertions so API-contract changes remain easy to
review.

Fixtures in `test/fixtures/` must be synthetic and redacted. They must not
contain real API keys, plugin UUIDs, device identifiers, webhook headers, or
account data. Update the smallest relevant fixture when an API shape changes.

Automated tests cannot prove hosted TRMNL state or physical-device delivery.
For changes that affect credentials, API requests, rendering, polling, merge
semantics, or device-facing behavior, follow the relevant cases in
[`docs/manual-test-matrix.md`](docs/manual-test-matrix.md). Distinguish between:

1. a successful n8n execution;
2. TRMNL accepting or rendering the data;
3. the physical device displaying it after refresh.

## Pull Requests

Keep each pull request focused and explain:

- what changed and why;
- whether workflows or credentials are affected;
- which automated checks passed;
- which live checks were completed, or why they were not required.

Do not commit generated `dist/` output. Before requesting review, run
`pnpm test`, `pnpm lint`, and any relevant manual checks.
