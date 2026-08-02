import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	buildPrivatePluginPayload,
	getJsonSizeBytes,
	normalizePrivatePluginEndpoint,
	parseJsonObject,
} from '../dist/nodes/Trmnl/helpers/payload.js';

describe('TRMNL payload helpers', () => {
	it('keeps a full webhook URL', () => {
		assert.deepEqual(
			normalizePrivatePluginEndpoint('https://trmnl.com/api/custom_plugins/asdfqwerty1234'),
			{ ok: true, value: 'https://trmnl.com/api/custom_plugins/asdfqwerty1234' },
		);
	});

	it('converts a plugin UUID to the default webhook endpoint', () => {
		assert.deepEqual(normalizePrivatePluginEndpoint('asdf-qwerty_1234'), {
			ok: true,
			value: 'https://trmnl.com/api/custom_plugins/asdf-qwerty_1234',
		});
	});

	it('rejects invalid UUID characters', () => {
		assert.deepEqual(normalizePrivatePluginEndpoint('bad uuid'), {
			ok: false,
			error: 'Plugin Setting UUID may only contain letters, numbers, underscores, or hyphens.',
		});
	});

	it('parses JSON object strings', () => {
		assert.deepEqual(parseJsonObject('{"title":"Hello"}', 'Merge Variables'), {
			ok: true,
			value: {
				title: 'Hello',
			},
		});
	});

	it('rejects JSON arrays', () => {
		assert.deepEqual(parseJsonObject('[]', 'Merge Variables'), {
			ok: false,
			error: 'Merge Variables must be a JSON object.',
		});
	});

	it('calculates UTF-8 JSON byte size', () => {
		assert.equal(
			getJsonSizeBytes({ text: 'zażółć' }),
			Buffer.byteLength(JSON.stringify({ text: 'zażółć' }), 'utf8'),
		);
	});

	it('builds a replace payload without an explicit merge strategy', () => {
		assert.deepEqual(buildPrivatePluginPayload({ title: 'Hello' }), {
			ok: true,
			value: {
				merge_variables: {
					title: 'Hello',
				},
			},
		});
	});

	it('builds a deep merge payload', () => {
		assert.deepEqual(
			buildPrivatePluginPayload(
				{
					sensor: {
						temperature: 42,
					},
				},
				{ mergeStrategy: 'deep_merge' },
			),
			{
				ok: true,
				value: {
					merge_variables: {
						sensor: {
							temperature: 42,
						},
					},
					merge_strategy: 'deep_merge',
				},
			},
		);
	});

	it('builds a stream payload with a stream limit', () => {
		assert.deepEqual(
			buildPrivatePluginPayload(
				{
					temperatures: [40, 42],
				},
				{ mergeStrategy: 'stream', streamLimit: 10 },
			),
			{
				ok: true,
				value: {
					merge_variables: {
						temperatures: [40, 42],
					},
					merge_strategy: 'stream',
					stream_limit: 10,
				},
			},
		);
	});

	it('rejects invalid stream limits', () => {
		assert.deepEqual(
			buildPrivatePluginPayload({ temperatures: [42] }, { mergeStrategy: 'stream', streamLimit: 0 }),
			{
				ok: false,
				error: 'Stream Limit must be a positive integer.',
			},
		);
	});
});
