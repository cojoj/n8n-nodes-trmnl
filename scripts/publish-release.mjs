import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const releaseTag = process.env.RELEASE_TAG;
const stableTagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function fail(message) {
	console.error(message);
	process.exit(1);
}

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_EVENT_NAME !== 'release') {
	fail('Publishing is only allowed from the GitHub Release workflow.');
}

if (process.env.GITHUB_REF_TYPE !== 'tag' || process.env.GITHUB_REF_NAME !== releaseTag) {
	fail('The GitHub Actions ref must be the release tag being published.');
}

if (releaseTag === undefined || !stableTagPattern.test(releaseTag)) {
	fail('RELEASE_TAG must use the stable v<major>.<minor>.<patch> format.');
}

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (packageJson.version !== releaseTag.slice(1)) {
	fail(`Package version ${packageJson.version} does not match release tag ${releaseTag}.`);
}

const n8nNodeEntrypoint = fileURLToPath(
	new URL('../node_modules/@n8n/node-cli/bin/n8n-node.mjs', import.meta.url),
);
const result = spawnSync(process.execPath, [n8nNodeEntrypoint, 'release'], {
	stdio: 'inherit',
	env: process.env,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
