import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TrmnlAccountApi } from '../dist/credentials/TrmnlAccountApi.credentials.js';
import { TrmnlPollingHeaderAuthApi } from '../dist/credentials/TrmnlPollingHeaderAuthApi.credentials.js';
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

	it('uses themed official glyphs and a masked value for Polling Header Auth', () => {
		const credential = new TrmnlPollingHeaderAuthApi();
		const headerValue = credential.properties.find((property) => property.name === 'headerValue');

		assert.deepEqual(credential.icon, officialTrmnlIcons);
		assert.ok(headerValue);
		assert.equal(headerValue.required, true);
		assert.equal(headerValue.typeOptions?.password, true);
	});

	it('authenticates Account API requests with the user key as a Bearer token', () => {
		const credential = new TrmnlAccountApi();

		assert.deepEqual(credential.authenticate, {
			type: 'generic',
			properties: {
				headers: {
					Authorization: '=Bearer {{$credentials.apiKey}}',
				},
			},
		});
		assert.deepEqual(credential.test, {
			request: {
				baseURL: 'https://trmnl.com',
				url: '/api/me',
				method: 'GET',
			},
		});
	});

	it('keeps the Private Plugin endpoint secret and required', () => {
		const credential = new TrmnlPrivatePluginApi();
		const endpoint = credential.properties.find((property) => property.name === 'webhookUrlOrUuid');

		assert.ok(endpoint);
		assert.equal(endpoint.required, true);
		assert.equal(endpoint.typeOptions?.password, true);
		assert.equal(endpoint.displayName, 'Webhook URL or Plugin Setting UUID');
		assert.match(endpoint.description ?? '', /saved Private Plugin/);
		assert.deepEqual(credential.test, {
			request: {
				url: 'https://trmnl.com',
				method: 'GET',
			},
		});
	});

	it('normalizes Private Plugin credential test requests like node execution', async () => {
		const { authenticate } = new TrmnlPrivatePluginApi();
		assert.equal(typeof authenticate, 'function');

		await assert.doesNotReject(async () => {
			assert.deepEqual(
				await authenticate(
					{ webhookUrlOrUuid: '  test-plugin_uuid  ' },
					{ method: 'GET', url: 'https://trmnl.com' },
				),
				{
					method: 'GET',
					url: 'https://trmnl.com/api/custom_plugins/test-plugin_uuid',
				},
			);
		});

		assert.deepEqual(
			await authenticate(
				{ webhookUrlOrUuid: ' HTTPS://TRMNL.COM/api/custom_plugins/test-plugin/ ' },
				{ method: 'GET', url: 'https://trmnl.com' },
			),
			{
				method: 'GET',
				url: 'https://trmnl.com/api/custom_plugins/test-plugin',
			},
		);

		await assert.rejects(
			authenticate(
				{ webhookUrlOrUuid: 'bad plugin uuid' },
				{ method: 'GET', url: 'https://trmnl.com' },
			),
			/Plugin Setting UUID may only contain letters, numbers, underscores, or hyphens/,
		);
	});

	it('explains the separate scope of Private Plugin and Account API credentials', () => {
		const privatePluginCredential = new TrmnlPrivatePluginApi();
		const accountCredential = new TrmnlAccountApi();
		const privatePluginNotice = privatePluginCredential.properties.find(
			(property) => property.name === 'privatePluginNotice',
		);
		const accountNotice = accountCredential.properties.find(
			(property) => property.name === 'accountApiNotice',
		);
		const accountApiKey = accountCredential.properties.find(
			(property) => property.name === 'apiKey',
		);

		assert.ok(privatePluginNotice);
		assert.equal(privatePluginNotice.type, 'notice');
		assert.match(privatePluginNotice.displayName, /Webhook strategy/);
		assert.ok(accountNotice);
		assert.equal(accountNotice.type, 'notice');
		assert.match(accountNotice.displayName, /Device and Plugin Setting read operations/);
		assert.match(accountNotice.displayName, /do not change plugin data, markup, playlists, or devices/);
		assert.ok(accountApiKey);
		assert.match(accountApiKey.description ?? '', /developer license/);
		assert.match(accountApiKey.description ?? '', /Do not enter a Private Plugin UUID/);
	});
});
