# Security Policy

## Supported Versions

The maintainer applies security fixes to the latest release and the default
branch. If you find a problem in an old release, first make sure that the
problem is in the latest release.

## Reporting a Vulnerability

Use GitHub's
[private vulnerability reporting form](https://github.com/cojoj/n8n-nodes-trmnl/security/advisories/new).
Do not open a public issue, pull request, or discussion for a suspected
vulnerability.

Give this information:

- Affected package and n8n versions
- Deployment type and applicable configuration
- Reproduction steps or a small workflow
- Expected behavior and actual behavior
- Possible effect and known fixes

Remove all secrets and private data from the report. This data includes API
keys, Webhook URLs, plugin UUIDs, Polling headers, account data, device IDs, and
workflow credentials.

If you expose a secret, rotate it before you send the report.

The maintainer will examine the report and correct the problem when necessary.
The maintainer and the reporter will agree on a publication time. Do not publish
details before the maintainer completes the work.

Use the public issue tracker for other bugs and feature requests. For a problem
in n8n or TRMNL, use the security process of that project.
