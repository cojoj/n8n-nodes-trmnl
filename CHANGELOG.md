# 0.2.0

- Added read-only Plugin Setting List, Get Details, and Get Data operations through the existing TRMNL Account API credential.
- Added optional Plugin ID filtering, expression-friendly identifier validation, response preservation, array-to-items normalization, and credential-safe Account API errors.
- Added synthetic fixtures, focused automated coverage, and a hosted acceptance matrix for the 0.2.0 Plugin Setting read slice.

# 0.1.1

- Added package contract fixtures and tests, and modularized the TRMNL node implementation without changing its resources or operations.
- Remediated vulnerable transitive dependencies and upgraded the n8n node toolchain with a scheduled latest-version compatibility check.
- Added GitHub Release-triggered publishing through npm Trusted Publishing, along with signed-tag release guidance and restricted workflow permissions.
- Added contribution and security policies plus pull request and generated-release templates.

# 0.1.0

- Added Private Plugin Set Content and Get Content operations with Replace, Deep Merge, and Stream strategies.
- Added Markup Render with literal Liquid markup and convenient top-level rendered output.
- Added read-only Account API Device List and Get operations.
- Added a synchronous TRMNL Polling trigger with GET/POST support and root JSON responses.
- Added optional encrypted header authentication for incoming Polling requests without exposing request headers to workflow data.
- Added native fields and JSON input modes, payload validation, official TRMNL glyphs, examples, setup guidance, tests, CI, and an MIT license.
- Live-validated the Webhook flow on a physical TRMNL device and synchronous Polling through hosted TRMNL's rendered markup preview.
