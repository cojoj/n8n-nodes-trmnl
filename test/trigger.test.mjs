import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TrmnlTrigger } from '../dist/nodes/Trmnl/TrmnlTrigger.node.js';
import { loadFixture } from './helpers/load-fixture.mjs';

function createWebhookContext({
	parameters = { httpMethod: 'GET', authentication: 'none' },
	headers = {},
	body = {},
	query = {},
	params = {},
	credentials = { headerName: 'X-TRMNL-Token', headerValue: 'expected-token' },
	credentialError,
} = {}) {
	const response = {
		statusCode: undefined,
		headers: {},
		ended: false,
		status(code) {
			this.statusCode = code;
			return this;
		},
		setHeader(name, value) {
			this.headers[name] = value;
		},
		end() {
			this.ended = true;
		},
	};

	return {
		context: {
			getNodeParameter: (name, fallback) =>
				Object.prototype.hasOwnProperty.call(parameters, name) ? parameters[name] : fallback,
			getCredentials: async () => {
				if (credentialError) {
					throw credentialError;
				}

				return credentials;
			},
			getHeaderData: () => headers,
			getBodyData: () => body,
			getQueryData: () => query,
			getParamsData: () => params,
			getRequestObject: () => ({ method: parameters.httpMethod }),
			getResponseObject: () => response,
		},
		response,
	};
}

describe('TRMNL Trigger', () => {
	it('returns the last node root JSON with HTTP 200', () => {
		const { description } = new TrmnlTrigger();
		const webhook = description.webhooks?.[0];

		assert.ok(webhook);
		assert.equal(webhook.httpMethod, '={{$parameter["httpMethod"]}}');
		assert.equal(webhook.responseMode, 'lastNode');
		assert.equal(webhook.responseCode, undefined);
		assert.equal(webhook.responseData, 'firstEntryJson');
	});

	it('documents current hosted Polling Header syntax and synchronous production requirements', () => {
		const properties = new TrmnlTrigger().description.properties;
		const headerNotice = properties.find(
			(property) => property.name === 'pollingHeaderFormatNotice',
		);
		const setupNotice = properties.find((property) => property.name === 'pollingSetupNotice');
		const synchronousNotice = properties.find(
			(property) => property.name === 'synchronousPollingNotice',
		);

		assert.match(headerNotice?.displayName ?? '', /Name: Value \(or name=value\)/);
		assert.match(setupNotice?.displayName ?? '', /active and publicly reachable over HTTPS/);
		assert.match(synchronousNotice?.displayName ?? '', /Keep the path fast/);
		assert.doesNotMatch(synchronousNotice?.displayName ?? '', /\d+ ?(ms|seconds?)/i);
	});

	it('uses no-op webhook lifecycle hooks because TRMNL URLs are configured manually', async () => {
		const trigger = new TrmnlTrigger();

		assert.equal(await trigger.webhookMethods.default.checkExists.call({}), true);
		assert.equal(await trigger.webhookMethods.default.create.call({}), true);
		assert.equal(await trigger.webhookMethods.default.delete.call({}), true);
	});

	it('validates that both Polling Header credential fields are present', async () => {
		const testCredential = new TrmnlTrigger().methods.credentialTest
			.testPollingHeaderAuthCredential;

		assert.deepEqual(
			await testCredential.call(
				{},
				{
					data: { headerName: 'X-TRMNL-Token', headerValue: 'secret' },
				},
			),
			{
				status: 'OK',
				message:
					'Local Header Auth configuration is valid. This does not contact TRMNL or test the production URL.',
			},
		);
		assert.equal((await testCredential.call({}, { data: {} })).status, 'Error');
		assert.equal(
			(
				await testCredential.call(
					{},
					{ data: { headerName: 'Bad Header:', headerValue: 'secret' } },
				)
			).status,
			'Error',
		);
		assert.equal(
			(
				await testCredential.call(
					{},
					{ data: { headerName: 'X-TRMNL-Token', headerValue: 'line\nbreak' } },
				)
			).status,
			'Error',
		);
	});

	it('emits request data without copying inbound headers into the workflow', async () => {
		const pollingRequest = loadFixture('polling-request.json');
		const { context } = createWebhookContext({
			parameters: { httpMethod: 'POST', authentication: 'none' },
			...pollingRequest,
		});
		const result = await new TrmnlTrigger().webhook.call(context);

		assert.deepEqual(result, {
			workflowData: [
				[
					{
						json: {
							event: 'polling',
							requestMethod: 'POST',
							query: pollingRequest.query,
							params: pollingRequest.params,
							body: pollingRequest.body,
						},
					},
				],
			],
		});
		assert.equal(Object.hasOwn(result.workflowData[0][0].json, 'headers'), false);
	});

	it('accepts a matching Header Auth credential for GET and POST', async () => {
		for (const httpMethod of ['GET', 'POST']) {
			const { context, response } = createWebhookContext({
				parameters: { httpMethod, authentication: 'headerAuth' },
				headers: { 'X-TRMNL-TOKEN': 'expected-token' },
			});
			const result = await new TrmnlTrigger().webhook.call(context);

			assert.ok(result.workflowData);
			assert.equal(result.workflowData.length, 1);
			assert.equal(result.workflowData[0].length, 1);
			assert.equal(result.workflowData[0][0].json.requestMethod, httpMethod);
			assert.equal(response.ended, false);
		}
	});

	it('rejects missing, malformed, or wrong Header Auth without starting the workflow', async () => {
		for (const setup of [
			{ headers: {} },
			{ headers: { 'x-trmnl-token': ['expected-token', 'duplicate'] } },
			{ headers: { 'x-trmnl-token': 'wrong-token' } },
			{ credentials: { headerName: 'Bad Header:', headerValue: 'expected-token' } },
			{ credentialError: new Error('Credential unavailable') },
		]) {
			const { context, response } = createWebhookContext({
				parameters: { httpMethod: 'GET', authentication: 'headerAuth' },
				...setup,
			});
			const result = await new TrmnlTrigger().webhook.call(context);

			assert.deepEqual(result, { noWebhookResponse: true });
			assert.equal(response.statusCode, 401);
			assert.equal(response.headers['WWW-Authenticate'], 'Header realm="TRMNL Trigger"');
			assert.equal(response.ended, true);
		}
	});
});
