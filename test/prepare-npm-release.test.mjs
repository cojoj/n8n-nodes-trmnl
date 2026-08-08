import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
	demoteMarkdownHeadings,
	getStableVersion,
	prepareNpmRelease,
	releaseNotesEndMarker,
	releaseNotesStartMarker,
	renderNpmReadme,
} from '../.github/scripts/prepare-npm-release.mjs';

const sourceReadme = `# Example

Package introduction.

${releaseNotesStartMarker}
${releaseNotesEndMarker}

## Installation
`;

const stableRelease = {
	tag_name: 'v0.3.0',
	body: `## Features

- Added a release-driven npm README.

\`\`\`markdown
## This heading is inside a code fence
\`\`\``,
	html_url: 'https://github.com/cojoj/n8n-nodes-trmnl/releases/tag/v0.3.0',
	draft: false,
	prerelease: false,
};

describe('npm release preparation', () => {
	it('accepts stable semantic-version tags without leading zeroes', () => {
		assert.equal(getStableVersion('v0.3.0'), '0.3.0');
		assert.equal(getStableVersion('v12.4.9'), '12.4.9');
		assert.throws(() => getStableVersion('0.3.0'), /stable v<major>/);
		assert.throws(() => getStableVersion('v01.3.0'), /stable v<major>/);
		assert.throws(() => getStableVersion('v0.3.0-beta.1'), /stable v<major>/);
	});

	it('demotes release-note headings without changing fenced examples', () => {
		const rendered = demoteMarkdownHeadings(stableRelease.body);

		assert.match(rendered, /^### Features/m);
		assert.match(rendered, /^## This heading is inside a code fence/m);
	});

	it('adds replaceable release notes near the top of the npm README', () => {
		const first = renderNpmReadme(sourceReadme, stableRelease, 'cojoj/n8n-nodes-trmnl');

		assert.equal(first.version, '0.3.0');
		assert.match(first.readme, /## What's new in v0\.3\.0/);
		assert.match(first.readme, /### Features/);
		assert.match(first.readme, /View the v0\.3\.0 release on GitHub/);

		const next = renderNpmReadme(
			first.readme,
			{
				...stableRelease,
				tag_name: 'v0.3.1',
				body: '## Fixes\n\n- Fixed the release example.',
				html_url: undefined,
			},
			'cojoj/n8n-nodes-trmnl',
		);

		assert.doesNotMatch(next.readme, /What's new in v0\.3\.0/);
		assert.match(next.readme, /## What's new in v0\.3\.1/);
		assert.match(next.readme, /releases\/tag\/v0\.3\.1/);
	});

	it('requires generated or manually written release notes', () => {
		assert.throws(
			() => renderNpmReadme(sourceReadme, { ...stableRelease, body: '  ' }),
			/Generate release notes/,
		);
	});

	it('stamps the package version and npm README from the release event', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'trmnl-npm-release-'));
		const eventPath = join(directory, 'event.json');
		const packagePath = join(directory, 'package.json');
		const readmePath = join(directory, 'README.md');

		try {
			await Promise.all([
				writeFile(
					eventPath,
					JSON.stringify({
						action: 'published',
						release: stableRelease,
						repository: { full_name: 'cojoj/n8n-nodes-trmnl' },
					}),
				),
				writeFile(
					packagePath,
					`${JSON.stringify({ name: 'example', version: '0.2.0' }, null, '\t')}\n`,
				),
				writeFile(readmePath, sourceReadme),
			]);

			await prepareNpmRelease({ eventPath, packagePath, readmePath });

			const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
			const npmReadme = await readFile(readmePath, 'utf8');

			assert.equal(packageJson.version, '0.3.0');
			assert.match(npmReadme, /What's new in v0\.3\.0/);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
