import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

import { Trmnl } from '../dist/nodes/Trmnl/Trmnl.node.js';
import { loadFixture } from './helpers/load-fixture.mjs';

const require = createRequire(import.meta.url);
const { NodeApiError, NodeOperationError } = require('n8n-workflow');

function setContentParameters(overrides = {}) {
	return {
		resource: 'privatePlugin',
		operation: 'setContent',
		mergeVariablesMode: 'json',
		mergeVariables: '{"title":"Synthetic"}',
		mergeStrategy: 'replace',
		options: {},
		...overrides,
	};
}

function updateDataParameters() {
	return {
		resource: 'pluginSetting',
		operation: 'updateData',
		pluginSettingId: '31001',
		pluginSettingDataMode: 'json',
		pluginSettingData: '{"status":"ready"}',
	};
}

function updateSleepModeParameters() {
	return {
		resource: 'device',
		operation: 'updateSleepMode',
		deviceId: '101001',
		sleepModeEnabled: true,
		sleepStartTime: 1320,
		sleepEndTime: 480,
	};
}

function setVisibilityParameters() {
	return {
		resource: 'playlistItem',
		operation: 'setVisibility',
		playlistItemId: '41001',
		visible: false,
	};
}

function createErrorContext({
	parameters,
	httpError,
	httpResponse = { accepted: true },
	continueOnFail = false,
	inputCount = 1,
	errorOnRequest = 1,
}) {
	const requests = [];
	const node = {
		id: 'trmnl-error-test-node',
		name: 'TRMNL',
		type: 'n8n-nodes-trmnl.trmnl',
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};
	const request = async (authentication, options) => {
		requests.push({ authentication, options });

		if (requests.length === errorOnRequest) {
			throw httpError;
		}

		return httpResponse;
	};

	return {
		context: {
			getInputData: () => Array.from({ length: inputCount }, () => ({ json: {} })),
			getNodeParameter: (name, _itemIndex, fallback) =>
				Object.prototype.hasOwnProperty.call(parameters, name) ? parameters[name] : fallback,
			getNode: () => node,
			getCredentials: async (credentialType) =>
				credentialType === 'trmnlAccountApi'
					? { apiKey: '[redacted]' }
					: { webhookUrlOrUuid: 'synthetic-plugin-uuid' },
			continueOnFail: () => continueOnFail,
			helpers: {
				httpRequestWithAuthentication: async (authentication, options) =>
					await request(authentication, options),
				httpRequest: async (options) => await request(undefined, options),
			},
		},
		requests,
	};
}

async function captureApiError(options) {
	const { context, requests } = createErrorContext(options);
	let captured;

	await assert.rejects(new Trmnl().execute.call(context), (error) => {
		captured = error;
		return true;
	});

	assert.ok(captured instanceof NodeApiError);

	return { error: captured, requests };
}

describe('TRMNL API error handling', () => {
	it('explains the Account API and Private Plugin credential boundaries on 401', async () => {
		const unauthorized = loadFixture('errors/401.json');
		const account = await captureApiError({
			parameters: { resource: 'device', operation: 'list' },
			httpError: unauthorized,
		});
		const privatePlugin = await captureApiError({
			parameters: setContentParameters(),
			httpError: unauthorized,
		});

		assert.equal(account.error.httpCode, '401');
		assert.match(account.error.message, /Account API authentication failed/);
		assert.match(account.error.message, /developer access/);
		assert.equal(privatePlugin.error.httpCode, '401');
		assert.match(privatePlugin.error.message, /Private Plugin access failed/);
		assert.match(privatePlugin.error.message, /Webhook URL or Plugin Setting UUID/);
	});

	it('identifies safe target context and preserves 404 status', async () => {
		const { error } = await captureApiError({
			parameters: { resource: 'device', operation: 'get', deviceId: '101001' },
			httpError: loadFixture('errors/404.json'),
		});

		assert.equal(error.httpCode, '404');
		assert.match(error.message, /requested Device/);
		assert.doesNotMatch(error.message, /101001/);
		assert.equal(error.context.itemIndex, 0);
	});

	it('keeps Playlist Item identifiers out of 404 errors', async () => {
		const { error } = await captureApiError({
			parameters: setVisibilityParameters(),
			httpError: loadFixture('errors/404.json'),
		});

		assert.equal(error.httpCode, '404');
		assert.match(error.message, /requested Playlist Item/);
		assert.doesNotMatch(error.message, /41001/);
	});

	it('distinguishes documented Plugin Setting 422 capability failures', async () => {
		const unprocessable = loadFixture('errors/422.json');
		const cases = [
			{
				parameters: {
					resource: 'pluginSetting',
					operation: 'getData',
					pluginSettingId: '31001',
				},
				message: /no data available for this Plugin Setting/,
			},
			{
				parameters: updateDataParameters(),
				message: /cannot modify data for this Plugin Setting/,
			},
			{
				parameters: setVisibilityParameters(),
				message: /rejected this Playlist Item visibility change/,
			},
			{
				parameters: updateSleepModeParameters(),
				message: /rejected this Device sleep schedule/,
			},
			{
				parameters: {
					resource: 'pluginSetting',
					operation: 'writeMarkup',
					pluginSettingUuid: '00000000-0000-4000-8000-000000000001',
					markupSize: 'markup_custom',
					pluginSettingMarkup: 'Synthetic markup',
				},
				message: /could not process this markup operation/,
			},
		];

		for (const testCase of cases) {
			const { error } = await captureApiError({
				parameters: testCase.parameters,
				httpError: unprocessable,
			});

			assert.equal(error.httpCode, '422');
			assert.match(error.message, testCase.message);
		}
	});

	it('does not blame a documented markup size when only the write returns 422', async () => {
		const markupParameters = {
			resource: 'pluginSetting',
			pluginSettingUuid: '00000000-0000-4000-8000-000000000001',
			markupSize: 'markup_full',
		};
		const read = createErrorContext({
			parameters: { ...markupParameters, operation: 'readMarkup' },
			httpError: loadFixture('errors/422.json'),
			httpResponse: '<div>Supported markup size</div>',
			errorOnRequest: 2,
		});
		const readResult = await new Trmnl().execute.call(read.context);
		const write = await captureApiError({
			parameters: {
				...markupParameters,
				operation: 'writeMarkup',
				pluginSettingMarkup: '<div>One attempted write</div>',
			},
			httpError: loadFixture('errors/422.json'),
		});

		assert.equal(read.requests.length, 1);
		assert.equal(readResult[0][0].json.content, '<div>Supported markup size</div>');
		assert.equal(write.requests.length, 1);
		assert.equal(write.error.httpCode, '422');
		assert.match(write.error.message, /could not process this markup operation/);
		assert.doesNotMatch(write.error.message, /rejected this markup size|invalid size/i);
		assert.doesNotMatch(write.error.message, /redacted upstream capability error/);
		assert.doesNotMatch(write.error.message, /00000000-0000-4000-8000-000000000001/);
	});

	it('keeps Playlist Item writes single-attempt and paired under Continue On Fail', async () => {
		const { context, requests } = createErrorContext({
			parameters: setVisibilityParameters(),
			httpError: loadFixture('errors/429-without-retry-after.json'),
			continueOnFail: true,
		});
		const result = await new Trmnl().execute.call(context);

		assert.equal(requests.length, 1);
		assert.equal(result[0][0].pairedItem.item, 0);
		assert.equal(result[0][0].json.operation, 'setVisibility');
		assert.equal(result[0][0].json.resource, 'playlistItem');
		assert.equal(result[0][0].json.statusCode, 429);
		assert.match(result[0][0].json.error, /No automatic retry was attempted/);
		assert.match(result[0][0].json.error, /safe repeat behavior/);
	});

	it('preserves 429 and Retry-After context without retrying a write', async () => {
		const { context, requests } = createErrorContext({
			parameters: setContentParameters(),
			httpError: loadFixture('errors/429-with-retry-after.json'),
			continueOnFail: true,
		});
		const result = await new Trmnl().execute.call(context);

		assert.equal(requests.length, 1);
		assert.deepEqual(result, [
			[
				{
					json: {
						error:
							'TRMNL rate limit reached while setting Private Plugin content. Retry after 60 seconds, as directed by the Retry-After header. No automatic retry was attempted. Review the write for safe repeat behavior before enabling n8n Retry On Fail.',
						operation: 'setContent',
						resource: 'privatePlugin',
						statusCode: 429,
						retryAfter: '60',
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('handles 429 without inventing Retry-After guidance', async () => {
		const { error } = await captureApiError({
			parameters: { resource: 'privatePlugin', operation: 'getContent' },
			httpError: loadFixture('errors/429-without-retry-after.json'),
		});

		assert.equal(error.httpCode, '429');
		assert.match(error.message, /rate limit reached/);
		assert.doesNotMatch(error.message, /Retry after|Retry at or after/);
		assert.match(error.message, /Retry On Fail deliberately/);
	});

	it('classifies 5xx and network failures as clean NodeApiError values', async () => {
		const service = await captureApiError({
			parameters: {
				resource: 'markup',
				operation: 'render',
				markup: 'Synthetic',
				variablesMode: 'json',
				variables: '{}',
			},
			httpError: loadFixture('errors/503.json'),
		});
		const network = await captureApiError({
			parameters: { resource: 'privatePlugin', operation: 'getContent' },
			httpError: loadFixture('errors/network.json'),
		});

		assert.equal(service.error.httpCode, '503');
		assert.match(service.error.message, /TRMNL service failed/);
		assert.match(service.error.message, /HTTP 503/);
		assert.equal(network.error.httpCode, null);
		assert.match(network.error.message, /network request failed/);
		assert.equal(network.error.trmnlContext.networkErrorCode, 'ETIMEDOUT');
	});

	it('preserves the failing item index and paired item under Continue On Fail', async () => {
		const options = {
			parameters: setContentParameters(),
			httpError: loadFixture('errors/503.json'),
			inputCount: 2,
			errorOnRequest: 2,
		};
		const thrown = await captureApiError(options);

		assert.equal(thrown.error.context.itemIndex, 1);

		const { context } = createErrorContext({ ...options, continueOnFail: true });
		const result = await new Trmnl().execute.call(context);

		assert.equal(result[0][0].pairedItem.item, 0);
		assert.deepEqual(result[0][1].pairedItem, { item: 1 });
		assert.equal(result[0][1].json.statusCode, 503);
		assert.equal(result[0][1].json.operation, 'setContent');
	});

	it('never retains raw upstream secrets in errors or Continue On Fail output', async () => {
		const secret = 'synthetic_secret_must_not_escape';
		const rawError = {
			...loadFixture('errors/401.json'),
			message: `Rejected ${secret}`,
			response: {
				status: 401,
				headers: { Authorization: secret },
				body: { message: secret },
			},
		};
		const thrown = await captureApiError({
			parameters: { resource: 'device', operation: 'list' },
			httpError: rawError,
		});
		const { context } = createErrorContext({
			parameters: { resource: 'device', operation: 'list' },
			httpError: rawError,
			continueOnFail: true,
		});
		const continued = await new Trmnl().execute.call(context);

		assert.doesNotMatch(JSON.stringify(thrown.error), new RegExp(secret));
		assert.doesNotMatch(JSON.stringify(continued), new RegExp(secret));
	});

	it('keeps local validation failures as NodeOperationError without HTTP', async () => {
		const { context, requests } = createErrorContext({
			parameters: setContentParameters({ mergeVariables: '[]' }),
			httpError: loadFixture('errors/422.json'),
		});

		await assert.rejects(new Trmnl().execute.call(context), (error) => {
			assert.ok(error instanceof NodeOperationError);
			assert.equal(error.context.itemIndex, 0);
			return true;
		});
		assert.equal(requests.length, 0);
	});
});
