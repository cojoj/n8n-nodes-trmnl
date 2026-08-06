import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	assignmentsToJsonObject,
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

	it('rejects invalid JSON syntax', () => {
		assert.deepEqual(parseJsonObject('{"title":}', 'Merge Variables'), {
			ok: false,
			error: 'Merge Variables must contain valid JSON.',
		});
	});

	it('rejects JSON arrays', () => {
		assert.deepEqual(parseJsonObject('[]', 'Merge Variables'), {
			ok: false,
			error: 'Merge Variables must be a JSON object.',
		});
	});

	it('builds merge variables from typed field assignments', () => {
		assert.deepEqual(
			assignmentsToJsonObject({
				assignments: [
					{ name: 'title', value: 42, type: 'string' },
					{ name: 'count', value: '42', type: 'number' },
					{ name: 'enabled', value: 'false', type: 'boolean' },
					{ name: 'items', value: '["one", "two"]', type: 'array' },
					{ name: 'details', value: '{"nested":true}', type: 'object' },
				],
			}),
			{
				ok: true,
				value: {
					title: '42',
					count: 42,
					enabled: false,
					items: ['one', 'two'],
					details: { nested: true },
				},
			},
		);
	});

	it('requires field assignment names', () => {
		assert.deepEqual(
			assignmentsToJsonObject({
				assignments: [{ name: ' ', value: 'Hello', type: 'string' }],
			}),
			{
				ok: false,
				error: 'Each Merge Variables field must have a name.',
			},
		);
	});

	it('uses the supplied field label in assignment errors', () => {
		assert.deepEqual(
			assignmentsToJsonObject(
				{
					assignments: [{ name: '', value: 'Hello', type: 'string' }],
				},
				'Variables',
			),
			{
				ok: false,
				error: 'Each Variables field must have a name.',
			},
		);
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
			buildPrivatePluginPayload(
				{ temperatures: [42] },
				{ mergeStrategy: 'stream', streamLimit: 0 },
			),
			{
				ok: false,
				error: 'Stream Limit must be a positive integer.',
			},
		);
	});
});
