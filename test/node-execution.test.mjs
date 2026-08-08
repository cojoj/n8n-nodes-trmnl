import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

import { Trmnl } from '../dist/nodes/Trmnl/Trmnl.node.js';
import { loadFixture } from './helpers/load-fixture.mjs';

const require = createRequire(import.meta.url);
const { NodeApiError } = require('n8n-workflow');

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

	it('sanitizes documented Account API error paths without exposing credentials', async () => {
		const cases = [
			{
				parameters: { resource: 'pluginSetting', operation: 'list' },
				statusCode: 401,
				message: /Account API authentication failed/,
			},
			{
				parameters: {
					resource: 'pluginSetting',
					operation: 'getDetails',
					pluginSettingUuid: '00000000-0000-4000-8000-000000000001',
				},
				statusCode: 404,
				message: /could not find the requested account resource/,
			},
			{
				parameters: {
					resource: 'pluginSetting',
					operation: 'getData',
					pluginSettingId: '31001',
				},
				statusCode: 422,
				message: /no data available for this Plugin Setting/,
			},
			{
				parameters: updateDataParameters(),
				statusCode: 422,
				message: /cannot modify data for this Plugin Setting/,
			},
			{
				parameters: {
					resource: 'pluginSetting',
					operation: 'readMarkup',
					pluginSettingUuid: '00000000-0000-4000-8000-000000000001',
					markupSize: 'markup_custom',
				},
				statusCode: 422,
				message: /rejected this markup size/,
			},
		];

		for (const testCase of cases) {
			const secret = 'user_fixture_secret_must_not_escape';
			const httpError = Object.assign(new Error(`Rejected ${secret}`), {
				statusCode: testCase.statusCode,
				response: { body: { message: secret }, request: { headers: { Authorization: secret } } },
			});
			const { context } = createExecuteContext({
				parameters: testCase.parameters,
				httpError,
			});

			await assert.rejects(new Trmnl().execute.call(context), (error) => {
				assert.ok(error instanceof NodeApiError);
				assert.equal(error.httpCode, String(testCase.statusCode));
				assert.match(error.message, testCase.message);
				assert.doesNotMatch(JSON.stringify(error), new RegExp(secret));
				return true;
			});
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

	it('wraps HTTP failures as NodeApiError', async () => {
		const httpError = Object.assign(new Error('TRMNL unavailable'), {
			statusCode: 503,
			response: { body: { message: 'Try again later' } },
		});
		const { context } = createExecuteContext({
			parameters: setContentParameters(),
			httpError,
		});

		await assert.rejects(new Trmnl().execute.call(context), (error) => {
			assert.ok(error instanceof NodeApiError);
			assert.equal(error.httpCode, '503');
			assert.equal(error.context.itemIndex, 0);
			return true;
		});
	});

	it('returns an error item for HTTP failures when Continue On Fail is enabled', async () => {
		const httpError = Object.assign(new Error('TRMNL unavailable'), {
			statusCode: 503,
		});
		const { result } = await executeWith({
			parameters: setContentParameters(),
			httpError,
			continueOnFail: true,
		});

		assert.deepEqual(result, [
			[
				{
					json: { error: 'TRMNL unavailable' },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('does not retry Plugin Setting writes and preserves pairing on Continue On Fail', async () => {
		const secret = 'user_fixture_secret_must_not_escape';
		const httpError = Object.assign(new Error(`Rejected ${secret}`), {
			statusCode: 422,
			response: { body: { message: secret } },
		});
		const { result, requests } = await executeWith({
			parameters: updateDataParameters(),
			httpError,
			continueOnFail: true,
		});

		assert.equal(requests.length, 1);
		assert.deepEqual(result, [
			[
				{
					json: {
						error:
							'TRMNL cannot modify data for this Plugin Setting. The setting may not support Account API data updates.',
					},
					pairedItem: { item: 0 },
				},
			],
		]);
		assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
	});
});
