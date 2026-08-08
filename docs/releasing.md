# Releasing

Publishing a stable GitHub Release deploys the matching package version to npm.
The publish workflow uses npm Trusted Publishing through GitHub OIDC and creates
provenance automatically; it does not use a long-lived npm token.

## Prepare the version

1. Create a release preparation branch from `main`.
2. Set the intended version without creating a tag:

   ```sh
   pnpm version VERSION --no-git-tag-version
   ```

3. Add a matching `# <version>` entry at the top of `CHANGELOG.md`.
4. Run `pnpm test` and `pnpm lint`, then merge the preparation pull request.

Do not run `pnpm release` locally. Outside GitHub Actions, that command owns the
version bump, changelog, tag, push, and GitHub Release, which bypasses the
button-driven flow below.

## Sign the tag

After the preparation pull request is merged, update local `main` and create an
annotated, signed tag for its release commit:

```sh
git switch main
git pull --ff-only
git tag -s vVERSION -m "Release vVERSION"
git verify-tag vVERSION
git push origin vVERSION
```

Replace `VERSION` with the intended package version. For example, package
version `0.2.0` must use tag `v0.2.0`. Select this existing tag in GitHub; do
not create the tag in the release form.

## Publish from GitHub

1. Open **Releases**, then click **Draft a new release**.
2. Select the existing signed `v<version>` tag.
3. Click **Generate release notes**. GitHub categorizes merged pull requests
   using `.github/release.yml` and adds the full changelog link and contributors.
4. Review the generated notes against `CHANGELOG.md`. Leave **Set as a
   pre-release** clear for a stable npm release.
5. Click **Publish release**. This button triggers `.github/workflows/publish.yml`.

The workflow checks out the released tag and requires the tag to equal `v` plus
the version in `package.json`. A mismatch stops before installation or npm
publishing. Stable releases then run the n8n lint/build release path and publish
through the existing npm Trusted Publisher with provenance. Pre-releases are
intentionally skipped until an npm dist-tag policy is added.
