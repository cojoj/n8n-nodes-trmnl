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
	it('normalizes supported UUID shorthand and documented webhook URL forms', () => {
		for (const value of [
			'test-plugin_uuid-123',
			'  test-plugin_uuid-123  ',
			'https://trmnl.com/api/custom_plugins/test-plugin_uuid-123',
			' HTTPS://TRMNL.COM/api/custom_plugins/test-plugin_uuid-123/ ',
		]) {
			assert.deepEqual(normalizePrivatePluginEndpoint(value), {
				ok: true,
				value: 'https://trmnl.com/api/custom_plugins/test-plugin_uuid-123',
			});
		}
	});

	it('rejects invalid UUID characters', () => {
		assert.deepEqual(normalizePrivatePluginEndpoint('bad uuid'), {
			ok: false,
			error: 'Plugin Setting UUID may only contain letters, numbers, underscores, or hyphens.',
		});
	});

	it('rejects unsupported schemes and origins without exposing the plugin token', () => {
		const syntheticSecret = 'synthetic-secret_token-123';
		const unsupportedEndpoints = [
			`http://trmnl.com/api/custom_plugins/${syntheticSecret}`,
			`ftp://trmnl.com/api/custom_plugins/${syntheticSecret}`,
			`https://usetrmnl.com/api/custom_plugins/${syntheticSecret}`,
			`https://example.com/api/custom_plugins/${syntheticSecret}`,
			`https://api.trmnl.com/api/custom_plugins/${syntheticSecret}`,
			`https://trmnl.com.example/api/custom_plugins/${syntheticSecret}`,
			`https://trmnl.com./api/custom_plugins/${syntheticSecret}`,
			`https://127.0.0.1/api/custom_plugins/${syntheticSecret}`,
		];

		for (const endpoint of unsupportedEndpoints) {
			const result = normalizePrivatePluginEndpoint(endpoint);

			assert.equal(result.ok, false);
			assert.equal(result.error.includes(syntheticSecret), false);
		}
	});

	it('rejects credentials, ports, queries, and fragments without exposing the plugin token', () => {
		const syntheticSecret = 'synthetic-secret_token-123';
		const unsupportedEndpoints = [
			`https://user:password@trmnl.com/api/custom_plugins/${syntheticSecret}`,
			`https://@trmnl.com/api/custom_plugins/${syntheticSecret}`,
			`https://trmnl.com:443/api/custom_plugins/${syntheticSecret}`,
			`https://trmnl.com:8443/api/custom_plugins/${syntheticSecret}`,
			`https://trmnl.com/api/custom_plugins/${syntheticSecret}?source=n8n`,
			`https://trmnl.com/api/custom_plugins/${syntheticSecret}?`,
			`https://trmnl.com/api/custom_plugins/${syntheticSecret}#preview`,
			`https://trmnl.com/api/custom_plugins/${syntheticSecret}#`,
		];

		for (const endpoint of unsupportedEndpoints) {
			const result = normalizePrivatePluginEndpoint(endpoint);

			assert.equal(result.ok, false);
			assert.equal(result.error.includes(syntheticSecret), false);
		}
	});

	it('rejects noncanonical and ambiguous webhook paths', () => {
		const syntheticSecret = 'synthetic-secret_token-123';
		const unsupportedEndpoints = [
			`https://trmnl.com/api/custom_plugins/${syntheticSecret}/extra`,
			`https://trmnl.com/api/custom_plugins//${syntheticSecret}`,
			`https://trmnl.com/api/custom_plugins/${syntheticSecret}/.`,
			`https://trmnl.com/api/custom_plugins/${syntheticSecret}/../other`,
			`https://trmnl.com/api/custom_plugins/${syntheticSecret}%2fextra`,
			`https://trmnl.com/api/custom_plugins/synthetic%2dsecret`,
			`https://trmnl.com\\api\\custom_plugins\\${syntheticSecret}`,
			`https://trmnl.com/API/custom_plugins/${syntheticSecret}`,
			'https://trmnl.com/api/custom_plugins/',
		];

		for (const endpoint of unsupportedEndpoints) {
			const result = normalizePrivatePluginEndpoint(endpoint);

			assert.equal(result.ok, false);
			assert.equal(result.error.includes(syntheticSecret), false);
		}
	});

	it('returns fixed validation errors for malformed URLs', () => {
		assert.deepEqual(normalizePrivatePluginEndpoint('https://[invalid'), {
			ok: false,
			error: 'Webhook URL is invalid.',
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
