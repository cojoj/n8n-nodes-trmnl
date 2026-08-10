import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { accessSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));
const n8nEntrypoints = [...packageJson.n8n.nodes, ...packageJson.n8n.credentials];
const exampleWorkflows = [
	'examples/private-plugin-dashboard/workflow.json',
	'examples/private-plugin-polling/polling-workflow.json',
];
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
			},
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const manifests = JSON.parse(result.stdout);
		assert.equal(manifests.length, 1);
		const manifest = manifests[0];
		const tarballPath = resolve(packDirectory, manifest.filename);
		accessSync(tarballPath);

		const packedPackageResult = spawnSync('tar', ['-xOf', tarballPath, 'package/package.json'], {
			encoding: 'utf8',
		});
		assert.equal(
			packedPackageResult.status,
			0,
			packedPackageResult.stderr || packedPackageResult.stdout,
		);

		return {
			manifest,
			packedPackageJson: JSON.parse(packedPackageResult.stdout),
		};
	} finally {
		rmSync(packDirectory, { recursive: true, force: true });
	}
}

describe('npm package contract', () => {
	it('declares the metadata required for an n8n community package', () => {
		assert.equal(packageJson.name, 'n8n-nodes-trmnl');
		assert.equal(packageJson.publishConfig?.access, 'public');
		assert.ok(packageJson.keywords.includes('n8n-community-node-package'));
		assert.equal(packageJson.n8n.n8nNodesApiVersion, 1);
		assert.equal(packageJson.n8n.strict, true);
		assert.deepEqual(packageJson.dependencies ?? {}, {});
	});

	it('matches the transient package version to the stable release tag when publishing', () => {
		if (releaseTag === undefined) return;

		assert.match(releaseTag, /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
		assert.equal(packageJson.version, releaseTag.slice(1));
	});

	it('builds every node and credential entrypoint declared to n8n', () => {
		assert.equal(new Set(n8nEntrypoints).size, n8nEntrypoints.length);

		for (const entrypoint of n8nEntrypoints) {
			assert.match(entrypoint, /^dist\/.+\.js$/);
			accessSync(resolve(repositoryRoot, entrypoint));
		}
	});

	it('uses installable community-package node types in example workflows', () => {
		const expectedNodeTypes = new Set([
			`${packageJson.name}.trmnl`,
			`${packageJson.name}.trmnlTrigger`,
		]);

		for (const workflowPath of exampleWorkflows) {
			const workflow = JSON.parse(readFileSync(resolve(repositoryRoot, workflowPath), 'utf8'));
			const communityNodeTypes = workflow.nodes
				.map((node) => node.type)
				.filter((nodeType) => nodeType.includes('trmnl'));

			assert.ok(communityNodeTypes.length > 0, `${workflowPath} has no TRMNL node`);
			for (const nodeType of communityNodeTypes) {
				assert.ok(
					expectedNodeTypes.has(nodeType),
					`${workflowPath} uses an unrecognized TRMNL node type: ${nodeType}`,
				);
			}
		}
	});

	it('packs matching package metadata, runtime entrypoints, documentation, and examples', () => {
		const { manifest, packedPackageJson } = packPackage();
		const packedPaths = manifest.files.map((file) => file.path);

		assert.equal(manifest.name, packageJson.name);
		assert.equal(manifest.version, packageJson.version);
		assert.equal(manifest.filename, `${packageJson.name}-${packageJson.version}.tgz`);
		assert.equal(packedPackageJson.name, packageJson.name);
		assert.equal(packedPackageJson.version, packageJson.version);
		assert.deepEqual(packedPackageJson.n8n, packageJson.n8n);

		for (const requiredPath of ['package.json', 'README.md', 'LICENSE', ...n8nEntrypoints]) {
			assert.ok(packedPaths.includes(requiredPath), `${requiredPath} is missing from the package`);
		}

		assert.ok(packedPaths.some((path) => path.startsWith('docs/')));
		assert.ok(packedPaths.some((path) => path.startsWith('examples/')));
		assert.equal(
			packedPaths.some((path) => path.startsWith('test/')),
			false,
		);
		assert.equal(
			packedPaths.some((path) => path.startsWith('credentials/')),
			false,
		);
		assert.equal(
			packedPaths.some((path) => path.startsWith('nodes/') && !path.startsWith('dist/')),
			false,
		);
	});
});
