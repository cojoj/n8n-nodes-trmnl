# Releasing

Publishing a stable GitHub Release deploys that release to npm. The release tag
is the source of the npm package version, while GitHub's generated release notes
are the canonical release history. The repository and npm package use the same
unchanged `README.md`.

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
5. Review the generated notes. Leave **Set as a pre-release** clear for a
   stable npm release.
6. Click **Publish release**. This button triggers
   `.github/workflows/publish.yml`.

The workflow checks out the released tag and refuses to publish unless the tag
uses stable semantic versioning and points to a commit on `main`. It then:

1. stamps `package.json` with the version derived from the tag;
2. runs the n8n lint and build release path; and
3. publishes through the existing npm Trusted Publisher with provenance.

The package version change exists only in the published artifact. Contributors
do not maintain a committed changelog or prepare a version-bump pull request.

Do not run `pnpm release` locally. Outside GitHub Actions, that command owns the
version bump, tag, push, and GitHub Release, which bypasses this button-driven
flow.

Pre-releases remain intentionally skipped until an npm dist-tag policy is
added.
