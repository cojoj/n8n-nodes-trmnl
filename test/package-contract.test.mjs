import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { accessSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));
const n8nEntrypoints = [...packageJson.n8n.nodes, ...packageJson.n8n.credentials];
const releaseTag = process.env.RELEASE_TAG;

function packPackage() {
	const packDirectory = mkdtempSync(join(tmpdir(), 'n8n-nodes-trmnl-pack-'));

	try {
		const result = spawnSync(
			'npm',
			['pack', '--json', '--ignore-scripts', '--pack-destination', packDirectory],
			{
				cwd: repositoryRoot,
				encoding: 'utf8',
				env: {
					...process.env,
					NPM_CONFIG_CACHE: resolve(packDirectory, 'npm-cache'),
				},
			},
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const manifests = JSON.parse(result.stdout);
		assert.equal(manifests.length, 1);
		const manifest = manifests[0];
		const tarballPath = resolve(packDirectory, manifest.filename);
		accessSync(tarballPath);
		const extractDirectory = resolve(packDirectory, 'extracted');
		mkdirSync(extractDirectory);
		const extractResult = spawnSync('tar', ['-xf', tarballPath, '-C', extractDirectory], {
			encoding: 'utf8',
		});
		assert.equal(extractResult.status, 0, extractResult.stderr || extractResult.stdout);
		const extractedPackageRoot = resolve(extractDirectory, 'package');
		const extractedNodeModules = resolve(extractedPackageRoot, 'node_modules');
		mkdirSync(extractedNodeModules);
		symlinkSync(
			resolve(repositoryRoot, 'node_modules/n8n-workflow'),
			resolve(extractedNodeModules, 'n8n-workflow'),
			process.platform === 'win32' ? 'junction' : 'dir',
		);

		return {
			cleanup: () => rmSync(packDirectory, { recursive: true, force: true }),
			extractedPackageRoot,
			manifest,
			packedPackageJson: JSON.parse(
				readFileSync(resolve(extractedPackageRoot, 'package.json'), 'utf8'),
			),
		};
	} catch (error) {
		rmSync(packDirectory, { recursive: true, force: true });
		throw error;
	}
}

describe('npm package contract', () => {
	it('declares the metadata required for an n8n community package', () => {
		assert.equal(packageJson.name, 'n8n-nodes-trmnl');
		assert.equal(packageJson.publishConfig?.access, 'public');
		assert.ok(packageJson.keywords.includes('n8n-community-node-package'));
		assert.equal(packageJson.n8n.n8nNodesApiVersion, 1);
		assert.equal(packageJson.n8n.strict, true);
		assert.equal(packageJson.engines.node, '>=22');
		assert.equal(packageJson.bugs.url, 'https://github.com/cojoj/n8n-nodes-trmnl/issues');
		assert.deepEqual(packageJson.dependencies ?? {}, {});
	});

	it('matches the transient package version to the stable release tag when publishing', () => {
		if (releaseTag === undefined) return;

		assert.match(releaseTag, /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
		assert.equal(packageJson.version, releaseTag.slice(1));
	});

	it('refuses to run the release entrypoint outside a GitHub Release job', () => {
		const result = spawnSync(process.execPath, ['scripts/publish-release.mjs'], {
			cwd: repositoryRoot,
			encoding: 'utf8',
			env: {
				...process.env,
				GITHUB_ACTIONS: 'false',
				GITHUB_EVENT_NAME: 'push',
				GITHUB_REF_NAME: 'main',
				GITHUB_REF_TYPE: 'branch',
				RELEASE_TAG: 'v1.0.0',
			},
		});

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Publishing is only allowed from the GitHub Release workflow/);
	});

	it('rejects invalid release refs, tags, and package versions before publication', () => {
		const mismatchedReleaseTag = `v${Number(packageJson.version.split('.')[0]) + 1}.0.0`;
		const invalidReleaseCases = [
			{
				environment: {
					GITHUB_REF_TYPE: 'branch',
					GITHUB_REF_NAME: 'v0.2.0',
					RELEASE_TAG: 'v0.2.0',
				},
				expectedError: /GitHub Actions ref must be the release tag/,
			},
			{
				environment: {
					GITHUB_REF_TYPE: 'tag',
					GITHUB_REF_NAME: 'v0.2.1',
					RELEASE_TAG: 'v0.2.0',
				},
				expectedError: /GitHub Actions ref must be the release tag/,
			},
			{
				environment: {
					GITHUB_REF_TYPE: 'tag',
					GITHUB_REF_NAME: '1.0.0',
					RELEASE_TAG: '1.0.0',
				},
				expectedError: /RELEASE_TAG must use the stable/,
			},
			{
				environment: {
					GITHUB_REF_TYPE: 'tag',
					GITHUB_REF_NAME: mismatchedReleaseTag,
					RELEASE_TAG: mismatchedReleaseTag,
				},
				expectedError: /Package version .* does not match release tag/,
			},
		];

		for (const { environment, expectedError } of invalidReleaseCases) {
			const result = spawnSync(process.execPath, ['scripts/publish-release.mjs'], {
				cwd: repositoryRoot,
				encoding: 'utf8',
				env: {
					...process.env,
					GITHUB_ACTIONS: 'true',
					GITHUB_EVENT_NAME: 'release',
					...environment,
				},
			});

			assert.equal(result.status, 1);
			assert.match(result.stderr, expectedError);
		}
	});

	it('builds every node and credential entrypoint declared to n8n', () => {
		assert.equal(new Set(n8nEntrypoints).size, n8nEntrypoints.length);

		for (const entrypoint of n8nEntrypoints) {
			assert.match(entrypoint, /^dist\/.+\.js$/);
			accessSync(resolve(repositoryRoot, entrypoint));
		}
	});

	it('packs and loads only the runtime package surface', () => {
		const { cleanup, extractedPackageRoot, manifest, packedPackageJson } = packPackage();

		try {
			const packedPaths = manifest.files.map((file) => file.path);

			assert.equal(manifest.name, packageJson.name);
			assert.equal(manifest.version, packageJson.version);
			assert.equal(manifest.filename, `${packageJson.name}-${packageJson.version}.tgz`);
			assert.equal(packedPackageJson.name, packageJson.name);
			assert.equal(packedPackageJson.version, packageJson.version);
			assert.deepEqual(packedPackageJson.n8n, packageJson.n8n);

			for (const requiredPath of [
				'package.json',
				'README.md',
				'LICENSE',
				'docs/brand-assets.md',
				...n8nEntrypoints,
			]) {
				assert.ok(
					packedPaths.includes(requiredPath),
					`${requiredPath} is missing from the package`,
				);
			}

			for (const excludedPrefix of ['credentials/', 'nodes/', 'test/']) {
				assert.equal(
					packedPaths.some((path) => path.startsWith(excludedPrefix)),
					false,
					`${excludedPrefix} source files must not be packed`,
				);
			}
			assert.deepEqual(
				packedPaths.filter((path) => path.startsWith('docs/')),
				['docs/brand-assets.md'],
			);
			assert.equal(
				packedPaths.some((path) => path.endsWith('.d.ts')),
				false,
				'TypeScript declarations must not expose an unsupported package API',
			);
			assert.ok(
				packedPaths.some((path) => path.endsWith('.js.map')),
				'Runtime source maps must remain available for stack-trace diagnostics',
			);
			assert.equal(packedPaths.includes('dist/package.json'), false);

			const requireFromPackage = createRequire(resolve(extractedPackageRoot, 'package.json'));
			for (const entrypoint of n8nEntrypoints) {
				const exports = Object.values(requireFromPackage(`./${entrypoint}`));
				const exportedTypes = exports.filter((value) => typeof value === 'function');

				assert.ok(exportedTypes.length > 0, `${entrypoint} has no loadable type export`);
				for (const ExportedType of exportedTypes) new ExportedType();
			}
		} finally {
			cleanup();
		}
	});
});
