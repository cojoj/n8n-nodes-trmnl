import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { accessSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));
const n8nEntrypoints = [...packageJson.n8n.nodes, ...packageJson.n8n.credentials];

function packDryRun() {
	const pnpmEntrypoint = process.env.npm_execpath;
	const command = pnpmEntrypoint ? process.execPath : 'pnpm';
	const args = pnpmEntrypoint
		? [pnpmEntrypoint, 'pack', '--dry-run', '--json']
		: ['pack', '--dry-run', '--json'];
	const result = spawnSync(command, args, {
		cwd: repositoryRoot,
		encoding: 'utf8',
	});

	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
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

	it('builds every node and credential entrypoint declared to n8n', () => {
		assert.equal(new Set(n8nEntrypoints).size, n8nEntrypoints.length);

		for (const entrypoint of n8nEntrypoints) {
			assert.match(entrypoint, /^dist\/.+\.js$/);
			accessSync(resolve(repositoryRoot, entrypoint));
		}
	});

	it('packs the runtime entrypoints, documentation, and examples without test sources', () => {
		const manifest = packDryRun();
		const packedPaths = manifest.files.map((file) => file.path);

		for (const requiredPath of ['package.json', 'README.md', 'LICENSE', ...n8nEntrypoints]) {
			assert.ok(packedPaths.includes(requiredPath), `${requiredPath} is missing from the package`);
		}

		assert.ok(packedPaths.some((path) => path.startsWith('docs/')));
		assert.ok(packedPaths.some((path) => path.startsWith('examples/')));
		assert.equal(packedPaths.some((path) => path.startsWith('test/')), false);
		assert.equal(packedPaths.some((path) => path.startsWith('credentials/')), false);
		assert.equal(
			packedPaths.some((path) => path.startsWith('nodes/') && !path.startsWith('dist/')),
			false,
		);
	});
});
