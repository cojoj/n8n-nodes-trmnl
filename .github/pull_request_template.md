## Summary

<!-- Explain what changed, why it is needed, and link a related issue when applicable. -->

## Validation

<!-- Check only what you ran. Explain any relevant unchecked item. -->

- [ ] `pnpm test`
- [ ] `pnpm lint`
- [ ] `pnpm pack --dry-run` (package or dependency changes)
- [ ] Relevant checks from `docs/manual-test-matrix.md` (behavior or integration changes)

## Live validation

<!--
Describe any n8n, TRMNL preview/activity, or physical-device checks performed.
Keep these outcomes distinct. Write "Not required" for documentation-only or
internal changes.
-->

## Compatibility and security

- [ ] Existing node, operation, parameter, and credential names remain
  compatible, or the breaking change was discussed first.
- [ ] No real credentials, webhook URLs, plugin UUIDs, polling headers, account
  data, device identifiers, or other secrets are included.
- [ ] The package version and npm release notes are unchanged; the publish
  workflow derives both from the GitHub Release.
