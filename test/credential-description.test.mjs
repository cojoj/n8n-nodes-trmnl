import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TrmnlAccountApi } from '../dist/credentials/TrmnlAccountApi.credentials.js';
import { TrmnlPrivatePluginApi } from '../dist/credentials/TrmnlPrivatePluginApi.credentials.js';

const officialTrmnlIcons = {
	light: 'file:../nodes/Trmnl/trmnl.svg',
	dark: 'file:../nodes/Trmnl/trmnl.dark.svg',
};

describe('TRMNL credential descriptions', () => {
	it('uses themed official glyphs for Private Plugin credentials', () => {
		assert.deepEqual(new TrmnlPrivatePluginApi().icon, officialTrmnlIcons);
	});

	it('uses themed official glyphs for Account API credentials', () => {
		assert.deepEqual(new TrmnlAccountApi().icon, officialTrmnlIcons);
	});

	it('keeps the Private Plugin endpoint secret and required', () => {
		const credential = new TrmnlPrivatePluginApi();
		const endpoint = credential.properties.find(
			(property) => property.name === 'webhookUrlOrUuid',
		);

		assert.ok(endpoint);
		assert.equal(endpoint.required, true);
		assert.equal(endpoint.typeOptions?.password, true);
		assert.deepEqual(credential.test, {
			request: {
				url: '={{$credentials.webhookUrlOrUuid.startsWith("http") ? $credentials.webhookUrlOrUuid : "https://trmnl.com/api/custom_plugins/" + $credentials.webhookUrlOrUuid}}',
				method: 'GET',
			},
		});
	});
});
