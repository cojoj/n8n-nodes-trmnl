# Security Policy

## Supported Versions

This project is currently pre-1.0. Security fixes are made against the latest
published release and the default branch. If you encounter an issue on an older
release, first verify whether it is still present in the latest version.

## Reporting a Vulnerability

Please use GitHub's
[private vulnerability reporting form](https://github.com/cojoj/n8n-nodes-trmnl/security/advisories/new).
Do not open a public issue, pull request, or discussion for a suspected
vulnerability.

Include enough information to reproduce and assess the report:

- affected package and n8n versions;
- deployment type and relevant configuration;
- reproduction steps or a minimal workflow;
- expected and observed behavior;
- potential impact and any known mitigations.

Redact all API keys, webhook URLs, plugin UUIDs, polling-header secrets, account
data, device identifiers, workflow credentials, and other private information.
If a real secret was exposed, rotate it immediately before submitting the
report.

The maintainer will validate the report, coordinate a fix when needed, and
agree on disclosure timing with the reporter. Please allow reasonable time for
investigation and remediation before publishing details.

Ordinary bugs and feature requests can use the public issue tracker. Problems
in n8n or TRMNL themselves should be reported through the upstream project's
security process.
