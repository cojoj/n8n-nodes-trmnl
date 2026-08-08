# Releasing

Publishing a stable GitHub Release deploys that release to npm. The release tag
is the source of the npm package version, and the GitHub Release body becomes a
temporary **What's new** section near the top of the README rendered on
npmjs.com. Neither change is committed back to the repository.

The publish workflow uses npm Trusted Publishing through GitHub OIDC and creates
provenance automatically; it does not use a long-lived npm token.

## Publish from GitHub

1. Merge every pull request intended for the release and confirm required CI is
   passing on `main`.
2. Open **Releases**, then click **Draft a new release**.
3. In **Choose a tag**, enter a new stable `v<major>.<minor>.<patch>` tag, choose
   **Create new tag**, and target `main`.
4. Click **Generate release notes**. GitHub categorizes merged pull requests
   using `.github/release.yml` and adds the comparison link and contributors.
5. Review the generated notes. These notes will be visible both on the GitHub
   Release and in the README published to npm. Leave **Set as a pre-release**
   clear for a stable npm release.
6. Click **Publish release**. This button triggers
   `.github/workflows/publish.yml`.

The workflow checks out the released tag and refuses to publish unless the tag
uses stable semantic versioning and points to a commit on `main`. It then:

1. stamps `package.json` with the version derived from the tag;
2. inserts the release body between the npm-only markers in `README.md`;
3. runs the n8n lint and build release path; and
4. publishes through the existing npm Trusted Publisher with provenance.

GitHub Releases are the canonical release history. The package version and
npm-visible release section exist only in the published artifact. npm packages
are immutable, so later edits to a GitHub Release do not change an already
published package README.

Do not run `pnpm release` locally. Outside GitHub Actions, that command owns the
version bump, tag, push, and GitHub Release, which bypasses this button-driven
flow and does not have the release event used to build the npm README.

Pre-releases remain intentionally skipped until an npm dist-tag policy is
added.
