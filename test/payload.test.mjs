import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
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
});
