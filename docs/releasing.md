# Releasing

A stable GitHub Release starts npm publication. Its tag supplies the package
version. GitHub generates the release history. Trusted Publishing adds
provenance without a long-lived npm token.

## Publish from GitHub

1. Merge the selected pull requests. Make sure that all necessary CI checks on
   `main` are successful.
2. Open **Releases**, then click **Draft a new release**.
3. In **Choose a tag**, type a new stable `v<major>.<minor>.<patch>` tag. Select
   **Create new tag**. Set the target to `main`.
4. Generate the release notes. Examine the notes. Clear **Set as a
   pre-release**.
5. Click **Publish release**. This button starts
   `.github/workflows/publish.yml`.

The workflow stops if the stable semantic tag does not point to current `main`.
If the tag is correct, the workflow:

1. Sets the `package.json` version from the tag
2. Runs package, lint, formatting, and Cloud-support checks
3. Publishes through npm Trusted Publishing with provenance

The version change is only in the published artifact. Do not commit a version
change. Do not commit a changelog. Do not run `n8n-node release` directly. Use
`pnpm release` only in CI.

The workflow does not publish pre-releases until the project has an npm dist-tag
policy.
