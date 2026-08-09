import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Trmnl } from '../dist/nodes/Trmnl/Trmnl.node.js';
import { loadFixture } from './helpers/load-fixture.mjs';

function createExecuteContext({
	parameters,
	credentials = {
		trmnlPrivatePluginApi: { webhookUrlOrUuid: 'test-plugin-uuid' },
		trmnlAccountApi: { apiKey: 'user_test' },
	},
	httpResponse = { accepted: true },
	httpError,
	continueOnFail = false,
}) {
	const requests = [];
	const node = {
		id: 'trmnl-test-node',
		name: 'TRMNL',
		type: 'n8n-nodes-trmnl.trmnl',
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};

	const request = async (authentication, options) => {
		requests.push({ authentication, options });

		if (httpError) {
			throw httpError;
		}

		return httpResponse;
	};

	return {
		context: {
			getInputData: () => [{ json: {} }],
			getNodeParameter: (name, _itemIndex, fallback) =>
				Object.prototype.hasOwnProperty.call(parameters, name) ? parameters[name] : fallback,
			getNode: () => node,
			getCredentials: async (credentialType) => credentials[credentialType],
			continueOnFail: () => continueOnFail,
			helpers: {
				httpRequestWithAuthentication: async (authentication, options) =>
					request(authentication, options),
				httpRequest: async (options) => request(undefined, options),
			},
		},
		requests,
	};
}

async function executeWith(options) {
	const { context, requests } = createExecuteContext(options);
	const result = await new Trmnl().execute.call(context);

	return { result, requests };
}

function setContentParameters(overrides = {}) {
	return {
		resource: 'privatePlugin',
		operation: 'setContent',
		mergeVariablesMode: 'json',
		mergeVariables: '{"title":"Hello"}',
		mergeStrategy: 'replace',
		options: {},
		...overrides,
	};
}

function updateDataParameters(overrides = {}) {
	return {
		resource: 'pluginSetting',
		operation: 'updateData',
		pluginSettingId: '31001',
		pluginSettingDataMode: 'json',
		pluginSettingData: '{"status":"ready"}',
		...overrides,
	};
}

function updateSleepModeParameters(overrides = {}) {
	return {
		resource: 'device',
		operation: 'updateSleepMode',
		deviceId: '101001',
		sleepModeEnabled: true,
		sleepStartTime: 1320,
		sleepEndTime: 480,
		...overrides,
	};
}

function setVisibilityParameters(overrides = {}) {
	return {
		resource: 'playlistItem',
		operation: 'setVisibility',
		playlistItemId: '41001',
		visible: false,
		...overrides,
	};
}

describe('TRMNL node execution', () => {
	it('lists devices with Account API authentication and preserves each device', async () => {
		const httpResponse = loadFixture('account-devices-list.json');
		const devices = httpResponse.data;
		const { result, requests } = await executeWith({
			parameters: { resource: 'device', operation: 'list' },
			httpResponse,
		});

		assert.deepEqual(requests, [
			{
				authentication: 'trmnlAccountApi',
				options: {
					method: 'GET',
					url: 'https://trmnl.com/api/devices',
					json: true,
				},
			},
		]);
		assert.deepEqual(
			result[0].map((item) => item.json),
			devices,
		);
		assert.ok(result[0].every((item) => !Object.hasOwn(item.json, 'deviceUpdate')));
	});

	it('gets a device with Account API authentication and preserves its data', async () => {
		const httpResponse = loadFixture('account-device-get.json');
		const device = httpResponse.data;
		const { result, requests } = await executeWith({
			parameters: { resource: 'device', operation: 'get', deviceId: '101001' },
			httpResponse,
		});

		assert.deepEqual(requests, [
			{
				authentication: 'trmnlAccountApi',
				options: {
					method: 'GET',
					url: 'https://trmnl.com/api/devices/101001',
					json: true,
				},
			},
		]);
		assert.deepEqual(result[0][0].json, device);
		assert.equal(Object.hasOwn(result[0][0].json, 'deviceUpdate'), false);
	});

	it('rejects an invalid Device ID before making an Account API request', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'device', operation: 'get', deviceId: '../display' },
		});

		await assert.rejects(new Trmnl().execute.call(context), /Device ID must be a positive integer/);
		assert.equal(requests.length, 0);
	});

	it('rejects a zero Device ID before making an Account API request', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'device', operation: 'get', deviceId: '0' },
		});

		await assert.rejects(new Trmnl().execute.call(context), /Device ID must be a positive integer/);
		assert.equal(requests.length, 0);
	});

	it('updates Device sleep mode with only normalized documented settings', async () => {
		const httpResponse = loadFixture('account-device-sleep-update.json');
		const { result, requests } = await executeWith({
			parameters: updateSleepModeParameters({
				percent_charged: 99,
				unrelatedField: 'must-not-be-sent',
			}),
			httpResponse,
		});

		assert.deepEqual(requests, [
			{
				authentication: 'trmnlAccountApi',
				options: {
					method: 'PATCH',
					url: 'https://trmnl.com/api/devices/101001',
					headers: { 'Content-Type': 'application/json' },
					body: {
						sleep_mode_enabled: true,
						sleep_start_time: 1320,
						sleep_end_time: 480,
					},
					json: true,
				},
			},
		]);
		assert.deepEqual(result[0][0], {
			json: {
				operation: 'updateSleepMode',
				success: true,
				deviceId: 101001,
				requestedSettings: {
					sleep_mode_enabled: true,
					sleep_start_time: 1320,
					sleep_end_time: 480,
				},
				response: httpResponse,
			},
			pairedItem: { item: 0 },
		});
	});

	it('accepts minute-of-day boundaries and omits times when sleep mode is disabled', async () => {
		const enabled = await executeWith({
			parameters: updateSleepModeParameters({ sleepStartTime: 0, sleepEndTime: 1439 }),
		});
		const disabled = await executeWith({
			parameters: updateSleepModeParameters({
				sleepModeEnabled: false,
				sleepStartTime: 2000,
				sleepEndTime: -1,
			}),
		});

		assert.deepEqual(enabled.requests[0].options.body, {
			sleep_mode_enabled: true,
			sleep_start_time: 0,
			sleep_end_time: 1439,
		});
		assert.deepEqual(disabled.requests[0].options.body, {
			sleep_mode_enabled: false,
		});
		assert.deepEqual(disabled.result[0][0].json.requestedSettings, {
			sleep_mode_enabled: false,
		});
	});

	it('rejects invalid Device sleep IDs, booleans, and minute-of-day values before HTTP', async () => {
		for (const parameters of [
			updateSleepModeParameters({ deviceId: '0' }),
			updateSleepModeParameters({ sleepModeEnabled: 'true' }),
			updateSleepModeParameters({ sleepStartTime: -1 }),
			updateSleepModeParameters({ sleepStartTime: 1440 }),
			updateSleepModeParameters({ sleepEndTime: 480.5 }),
			updateSleepModeParameters({ sleepEndTime: '' }),
		]) {
			const { context, requests } = createExecuteContext({ parameters });

			await assert.rejects(
				new Trmnl().execute.call(context),
				/Device ID|Sleep Mode Enabled|Sleep Start|Sleep End/,
			);
			assert.equal(requests.length, 0);
		}
	});

	it('lists Playlist Items as individual items while preserving every returned field', async () => {
		const httpResponse = loadFixture('account-playlist-items-list.json');
		const { result, requests } = await executeWith({
			parameters: { resource: 'playlistItem', operation: 'list' },
			httpResponse,
		});

		assert.deepEqual(requests, [
			{
				authentication: 'trmnlAccountApi',
				options: {
					method: 'GET',
					url: 'https://trmnl.com/api/playlists/items',
					json: true,
				},
			},
		]);
		assert.deepEqual(
			result[0].map((item) => item.json),
			httpResponse.data,
		);
		assert.ok(result[0].every((item) => item.pairedItem.item === 0));
	});

	it('keeps a non-array Playlist Item List response as one normalized item', async () => {
		const httpResponse = { data: { message: 'Synthetic response' }, meta: { source: 'fixture' } };
		const { result } = await executeWith({
			parameters: { resource: 'playlistItem', operation: 'list' },
			httpResponse,
		});

		assert.deepEqual(result[0][0].json, httpResponse);
	});

	it('sets Playlist Item visibility with an exact boolean-only PATCH body', async () => {
		const httpResponse = loadFixture('account-playlist-item-visibility-update.json');

		for (const visible of [false, true]) {
			const { result, requests } = await executeWith({
				parameters: setVisibilityParameters({ visible, unrelatedField: 'must-not-be-sent' }),
				httpResponse,
			});

			assert.deepEqual(requests, [
				{
					authentication: 'trmnlAccountApi',
					options: {
						method: 'PATCH',
						url: 'https://trmnl.com/api/playlists/items/41001',
						headers: { 'Content-Type': 'application/json' },
						body: { visible },
						json: true,
					},
				},
			]);
			assert.deepEqual(result[0][0], {
				json: {
					operation: 'setVisibility',
					success: true,
					playlistItemId: 41001,
					visible,
					response: httpResponse,
				},
				pairedItem: { item: 0 },
			});
		}
	});

	it('rejects invalid Playlist Item IDs and non-boolean visibility before HTTP', async () => {
		for (const parameters of [
			setVisibilityParameters({ playlistItemId: '0' }),
			setVisibilityParameters({ playlistItemId: '../items' }),
			setVisibilityParameters({ visible: 'false' }),
		]) {
			const { context, requests } = createExecuteContext({ parameters });

			await assert.rejects(
				new Trmnl().execute.call(context),
				/Playlist Item ID|Visible must resolve to a boolean/,
			);
			assert.equal(requests.length, 0);
		}
	});

	it('lists plugin settings as individual items and preserves every returned field', async () => {
		const httpResponse = loadFixture('account-plugin-settings-list.json');
		const { result, requests } = await executeWith({
			parameters: { resource: 'pluginSetting', operation: 'list', pluginId: '' },
			httpResponse,
		});

		assert.deepEqual(requests, [
			{
				authentication: 'trmnlAccountApi',
				options: {
					method: 'GET',
					url: 'https://trmnl.com/api/plugin_settings',
					json: true,
				},
			},
		]);
		assert.deepEqual(
			result[0].map((item) => item.json),
			httpResponse.data,
		);
	});

	it('passes the documented optional plugin_id filter exactly', async () => {
		for (const pluginId of ['101', 'calendars']) {
			const { requests } = await executeWith({
				parameters: { resource: 'pluginSetting', operation: 'list', pluginId },
				httpResponse: { data: [] },
			});

			assert.deepEqual(requests, [
				{
					authentication: 'trmnlAccountApi',
					options: {
						method: 'GET',
						url: 'https://trmnl.com/api/plugin_settings',
						qs: { plugin_id: pluginId },
						json: true,
					},
				},
			]);
		}
	});

	it('keeps a non-array Plugin Setting List response as one normalized item', async () => {
		const httpResponse = { data: { message: 'Synthetic response' }, meta: { source: 'fixture' } };
		const { result } = await executeWith({
			parameters: { resource: 'pluginSetting', operation: 'list' },
			httpResponse,
		});

		assert.deepEqual(result[0][0].json, httpResponse);
	});

	it('gets Plugin Setting details by UUID and preserves available markup sizes', async () => {
		const httpResponse = loadFixture('account-plugin-setting-details.json');
		const pluginSetting = httpResponse.data;
		const { result, requests } = await executeWith({
			parameters: {
				resource: 'pluginSetting',
				operation: 'getDetails',
				pluginSettingUuid: pluginSetting.uuid,
			},
			httpResponse,
		});

		assert.deepEqual(requests, [
			{
				authentication: 'trmnlAccountApi',
				options: {
					method: 'GET',
					url: `https://trmnl.com/api/plugin_settings/${pluginSetting.uuid}/details`,
					json: true,
				},
			},
		]);
		assert.deepEqual(result[0][0].json, httpResponse);
		assert.deepEqual(result[0][0].json.data.available_markup_sizes, [
			'markup_full',
			'markup_half_horizontal',
			'markup_half_vertical',
			'markup_quadrant',
		]);
	});

	it('gets schema-free Plugin Setting data by numeric ID or UUID', async () => {
		const httpResponse = loadFixture('account-plugin-setting-data.json');
		const numeric = await executeWith({
			parameters: {
				resource: 'pluginSetting',
				operation: 'getData',
				pluginSettingId: '31001',
			},
			httpResponse,
		});
		const uuid = await executeWith({
			parameters: {
				resource: 'pluginSetting',
				operation: 'getData',
				pluginSettingId: '00000000-0000-4000-8000-000000000001',
			},
			httpResponse,
		});

		assert.equal(
			numeric.requests[0].options.url,
			'https://trmnl.com/api/plugin_settings/31001/data',
		);
		assert.equal(
			uuid.requests[0].options.url,
			'https://trmnl.com/api/plugin_settings/00000000-0000-4000-8000-000000000001/data',
		);
		assert.deepEqual(numeric.result[0][0].json, httpResponse);
		assert.deepEqual(uuid.result[0][0].json, httpResponse);
	});

	it('updates Plugin Setting data by numeric ID or UUID with the exact Account API body', async () => {
		const httpResponse = loadFixture('account-plugin-setting-data-update.json');
		const numeric = await executeWith({
			parameters: updateDataParameters(),
			httpResponse,
		});
		const uuid = await executeWith({
			parameters: updateDataParameters({
				pluginSettingId: '00000000-0000-4000-8000-000000000001',
			}),
			httpResponse,
		});

		assert.deepEqual(numeric.requests, [
			{
				authentication: 'trmnlAccountApi',
				options: {
					method: 'POST',
					url: 'https://trmnl.com/api/plugin_settings/31001/data',
					headers: { 'Content-Type': 'application/json' },
					body: { merge_variables: { status: 'ready' } },
					json: true,
				},
			},
		]);
		assert.equal(
			uuid.requests[0].options.url,
			'https://trmnl.com/api/plugin_settings/00000000-0000-4000-8000-000000000001/data',
		);
		assert.deepEqual(numeric.result[0][0].json, {
			operation: 'updateData',
			success: true,
			pluginSettingId: '31001',
			response: httpResponse,
		});
	});

	it('extracts literal markup from the live wrapped Account API response', async () => {
		const httpResponse = loadFixture('account-plugin-setting-markup-response.json');
		const pluginSettingUuid = '00000000-0000-4000-8000-000000000001';
		const { result } = await executeWith({
			parameters: {
				resource: 'pluginSetting',
				operation: 'readMarkup',
				pluginSettingUuid,
				markupSize: 'markup_full',
			},
			httpResponse,
		});

		assert.equal(result[0][0].json.content, httpResponse.data.markup);
		assert.match(result[0][0].json.content, /\r\n/);
		assert.deepEqual(result[0][0].json.response, httpResponse);
	});

	it('builds Plugin Setting data updates from native typed fields', async () => {
		const { requests } = await executeWith({
			parameters: updateDataParameters({
				pluginSettingDataMode: 'fields',
				pluginSettingDataAssignments: {
					assignments: [
						{ name: 'count', type: 'number', value: '2' },
						{ name: 'active', type: 'boolean', value: 'true' },
					],
				},
			}),
		});

		assert.deepEqual(requests[0].options.body, {
			merge_variables: { count: 2, active: true },
		});
	});

	it('rejects invalid Plugin Setting update JSON before making a request', async () => {
		for (const pluginSettingData of ['{"status":}', '[]']) {
			const { context, requests } = createExecuteContext({
				parameters: updateDataParameters({ pluginSettingData }),
			});

			await assert.rejects(new Trmnl().execute.call(context), /Merge Variables must/);
			assert.equal(requests.length, 0);
		}
	});

	it('reads Plugin Setting markup as exact literal text', async () => {
		const { content } = loadFixture('account-plugin-setting-markup.json');
		const pluginSettingUuid = '00000000-0000-4000-8000-000000000001';
		const { result, requests } = await executeWith({
			parameters: {
				resource: 'pluginSetting',
				operation: 'readMarkup',
				pluginSettingUuid,
				markupSize: 'markup_custom_landscape',
			},
			httpResponse: content,
		});

		assert.deepEqual(requests, [
			{
				authentication: 'trmnlAccountApi',
				options: {
					method: 'GET',
					url: `https://trmnl.com/api/plugin_settings/${pluginSettingUuid}/markup/markup_custom_landscape`,
					json: false,
				},
			},
		]);
		assert.deepEqual(result[0][0].json, {
			operation: 'readMarkup',
			success: true,
			pluginSettingUuid,
			size: 'markup_custom_landscape',
			content,
			response: { data: content },
		});
	});

	it('writes Plugin Setting markup literally with the exact Account API body', async () => {
		const httpResponse = loadFixture('account-plugin-setting-markup-write.json');
		const pluginSettingUuid = '00000000-0000-4000-8000-000000000001';
		const content = '<div>{% if status %}{{ status }}{% endif %}</div>\n';
		const { result, requests } = await executeWith({
			parameters: {
				resource: 'pluginSetting',
				operation: 'writeMarkup',
				pluginSettingUuid,
				markupSize: 'markup_full',
				pluginSettingMarkup: content,
			},
			httpResponse,
		});

		assert.deepEqual(requests, [
			{
				authentication: 'trmnlAccountApi',
				options: {
					method: 'PUT',
					url: `https://trmnl.com/api/plugin_settings/${pluginSettingUuid}/markup/markup_full`,
					headers: { 'Content-Type': 'application/json' },
					body: { content },
					json: true,
				},
			},
		]);
		assert.deepEqual(result[0][0].json, {
			operation: 'writeMarkup',
			success: true,
			pluginSettingUuid,
			size: 'markup_full',
			response: httpResponse,
		});
	});

	it('rejects invalid Plugin Setting identifiers before making requests', async () => {
		for (const parameters of [
			{ resource: 'pluginSetting', operation: 'list', pluginId: 'weather' },
			{ resource: 'pluginSetting', operation: 'getDetails', pluginSettingUuid: '../details' },
			{ resource: 'pluginSetting', operation: 'getData', pluginSettingId: '0' },
			updateDataParameters({ pluginSettingId: '../data' }),
			{
				resource: 'pluginSetting',
				operation: 'readMarkup',
				pluginSettingUuid: '00000000-0000-4000-8000-000000000001',
				markupSize: '../markup_full',
			},
			{
				resource: 'pluginSetting',
				operation: 'writeMarkup',
				pluginSettingUuid: 'bad/uuid',
				markupSize: 'markup_full',
				pluginSettingMarkup: 'Synthetic markup',
			},
		]) {
			const { context, requests } = createExecuteContext({ parameters });
			await assert.rejects(new Trmnl().execute.call(context), /Plugin (ID|Setting)|Markup Size/);
			assert.equal(requests.length, 0);
		}
	});

	it('posts Set Content and returns diagnostic output', async () => {
		const httpResponse = loadFixture('private-plugin-set-content.json');
		const { result, requests } = await executeWith({
			parameters: setContentParameters(),
			httpResponse,
		});

		assert.equal(requests.length, 1);
		assert.equal(requests[0].authentication, 'trmnlPrivatePluginApi');
		assert.deepEqual(requests[0].options, {
			method: 'POST',
			url: 'https://trmnl.com/api/custom_plugins/test-plugin-uuid',
			headers: { 'Content-Type': 'application/json' },
			body: { merge_variables: { title: 'Hello' } },
			json: true,
		});
		assert.deepEqual(result[0][0].json, {
			operation: 'setContent',
			success: true,
			payloadSizeBytes: 37,
			payloadLimitBytes: 2048,
			mergeVariables: { title: 'Hello' },
			mergeStrategy: 'replace',
			deviceUpdate: 'next_refresh',
			response: httpResponse,
		});
	});

	it('gets current Private Plugin content from the webhook endpoint', async () => {
		const httpResponse = loadFixture('private-plugin-get-content.json');
		const { result, requests } = await executeWith({
			parameters: { resource: 'privatePlugin', operation: 'getContent' },
			httpResponse,
		});

		assert.deepEqual(requests, [
			{
				authentication: 'trmnlPrivatePluginApi',
				options: {
					method: 'GET',
					url: 'https://trmnl.com/api/custom_plugins/test-plugin-uuid',
					json: true,
				},
			},
		]);
		assert.deepEqual(result[0][0].json, {
			operation: 'getContent',
			success: true,
			response: httpResponse,
		});
	});

	it('renders Liquid markup without Private Plugin credentials', async () => {
		const httpResponse = loadFixture('markup-render.json');
		const { result, requests } = await executeWith({
			parameters: {
				resource: 'markup',
				operation: 'render',
				markup: 'Hello, {{ name }}!',
				variablesMode: 'json',
				variables: '{"name":"Fixture"}',
			},
			httpResponse,
		});

		assert.deepEqual(requests, [
			{
				authentication: undefined,
				options: {
					method: 'POST',
					url: 'https://trmnl.com/api/markup',
					headers: { 'Content-Type': 'application/json' },
					body: {
						markup: 'Hello, {{ name }}!',
						variables: { name: 'Fixture' },
					},
					json: true,
				},
			},
		]);
		assert.deepEqual(result[0][0].json, {
			operation: 'render',
			success: true,
			variables: { name: 'Fixture' },
			rendered: 'Hello, Fixture!',
			response: httpResponse,
		});
	});

	it('preserves the raw Markup response when surfacing an empty rendered value', async () => {
		const { result } = await executeWith({
			parameters: {
				resource: 'markup',
				operation: 'render',
				markup: '',
				variablesMode: 'json',
				variables: '{}',
			},
			httpResponse: { data: '', warning: 'Empty markup' },
		});

		assert.deepEqual(result[0][0].json, {
			operation: 'render',
			success: true,
			variables: {},
			rendered: '',
			response: { data: '', warning: 'Empty markup' },
		});
	});

	it('keeps Markup responses without data unchanged under response', async () => {
		const { result } = await executeWith({
			parameters: {
				resource: 'markup',
				operation: 'render',
				markup: 'Static text',
				variablesMode: 'json',
				variables: '{}',
			},
			httpResponse: { markup: 'Static text' },
		});

		assert.deepEqual(result[0][0].json, {
			operation: 'render',
			success: true,
			variables: {},
			response: { markup: 'Static text' },
		});
	});

	it('passes deep_merge and stream controls in Set Content bodies', async () => {
		const deepMerge = await executeWith({
			parameters: setContentParameters({
				mergeVariables: '{"sensor":{"temperature":42}}',
				mergeStrategy: 'deep_merge',
			}),
		});
		const stream = await executeWith({
			parameters: setContentParameters({
				mergeVariables: '{"temperatures":[40,42]}',
				mergeStrategy: 'stream',
				streamLimit: 10,
			}),
		});

		assert.deepEqual(deepMerge.requests[0].options.body, {
			merge_variables: { sensor: { temperature: 42 } },
			merge_strategy: 'deep_merge',
		});
		assert.deepEqual(stream.requests[0].options.body, {
			merge_variables: { temperatures: [40, 42] },
			merge_strategy: 'stream',
			stream_limit: 10,
		});
	});

	it('rejects invalid JSON before making a request', async () => {
		const { context, requests } = createExecuteContext({
			parameters: setContentParameters({ mergeVariables: '{"title":}' }),
		});

		await assert.rejects(
			new Trmnl().execute.call(context),
			/Merge Variables must contain valid JSON/,
		);
		assert.equal(requests.length, 0);
	});

	it('rejects a non-object JSON value before making a request', async () => {
		const { context, requests } = createExecuteContext({
			parameters: setContentParameters({ mergeVariables: '[]' }),
		});

		await assert.rejects(new Trmnl().execute.call(context), /must be a JSON object/);
		assert.equal(requests.length, 0);
	});

	it('rejects an oversized payload before making a request', async () => {
		const { context, requests } = createExecuteContext({
			parameters: setContentParameters({
				mergeVariables: JSON.stringify({ blob: 'x'.repeat(100) }),
				options: { payloadLimitBytes: 50 },
			}),
		});

		await assert.rejects(
			new Trmnl().execute.call(context),
			/TRMNL payload is 131 bytes, which exceeds the configured 50 byte limit/,
		);
		assert.equal(requests.length, 0);
	});

});
