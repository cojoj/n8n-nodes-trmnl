import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const releaseNotesStartMarker = '<!-- npm-release-notes:start -->';
export const releaseNotesEndMarker = '<!-- npm-release-notes:end -->';

const stableTagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function getStableVersion(tagName) {
	const match = stableTagPattern.exec(tagName);

	if (!match) {
		throw new Error(
			`Release tag '${tagName}' must use the stable v<major>.<minor>.<patch> format.`,
		);
	}

	return tagName.slice(1);
}

export function demoteMarkdownHeadings(markdown) {
	let fenceCharacter;
	let fenceLength = 0;

	return markdown
		.split('\n')
		.map((line) => {
			const fence = /^\s*(`{3,}|~{3,})/.exec(line);

			if (fence) {
				const character = fence[1][0];

				if (!fenceCharacter) {
					fenceCharacter = character;
					fenceLength = fence[1].length;
				} else if (character === fenceCharacter && fence[1].length >= fenceLength) {
					fenceCharacter = undefined;
					fenceLength = 0;
				}

				return line;
			}

			if (fenceCharacter) return line;

			return line.replace(/^(#{1,5})(\s+)/, '#$1$2');
		})
		.join('\n');
}

export function renderNpmReadme(readme, release, repositoryName) {
	const markerPattern = new RegExp(`${releaseNotesStartMarker}[\\s\\S]*?${releaseNotesEndMarker}`);

	if (!markerPattern.test(readme)) {
		throw new Error('README.md is missing the npm release-notes markers.');
	}

	const version = getStableVersion(release.tag_name);
	const releaseBody = release.body?.trim();

	if (!releaseBody) {
		throw new Error(
			'The GitHub Release has no notes. Use Generate release notes before publishing.',
		);
	}

	const releaseUrl =
		release.html_url ??
		(repositoryName
			? `https://github.com/${repositoryName}/releases/tag/${encodeURIComponent(release.tag_name)}`
			: undefined);

	if (!releaseUrl) {
		throw new Error('The GitHub Release URL and repository name are both unavailable.');
	}

	const releaseSection = [
		releaseNotesStartMarker,
		'',
		`## What's new in ${release.tag_name}`,
		'',
		demoteMarkdownHeadings(releaseBody),
		'',
		`[View the ${release.tag_name} release on GitHub](${releaseUrl})`,
		'',
		releaseNotesEndMarker,
	].join('\n');

	return { readme: readme.replace(markerPattern, releaseSection), version };
}

export async function prepareNpmRelease({ eventPath, packagePath, readmePath }) {
	const event = JSON.parse(await readFile(eventPath, 'utf8'));
	const release = event.release;

	if (!release || event.action !== 'published' || release.draft || release.prerelease) {
		throw new Error('Expected a published stable GitHub Release event.');
	}

	const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
	const sourceReadme = await readFile(readmePath, 'utf8');
	const prepared = renderNpmReadme(
		sourceReadme,
		release,
		event.repository?.full_name ?? process.env.GITHUB_REPOSITORY,
	);

	packageJson.version = prepared.version;

	await Promise.all([
		writeFile(packagePath, `${JSON.stringify(packageJson, null, '\t')}\n`),
		writeFile(readmePath, prepared.readme),
	]);

	return prepared;
}

async function main() {
	const repositoryRoot = resolve(import.meta.dirname, '..', '..');
	const eventPath = process.env.GITHUB_EVENT_PATH;

	if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required.');

	const prepared = await prepareNpmRelease({
		eventPath,
		packagePath: resolve(repositoryRoot, 'package.json'),
		readmePath: resolve(repositoryRoot, 'README.md'),
	});

	console.log(`Prepared npm package ${prepared.version} with GitHub Release notes in README.md.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	await main();
}
