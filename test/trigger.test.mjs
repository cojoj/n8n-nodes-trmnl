import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TrmnlTrigger } from '../dist/nodes/Trmnl/TrmnlTrigger.node.js';

function createWebhookContext({
	parameters = { httpMethod: 'GET', authentication: 'none' },
	headers = {},
	body = {},
	query = {},
	params = {},
	credentials = { headerName: 'X-TRMNL-Token', headerValue: 'expected-token' },
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
			getCredentials: async () => credentials,
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
				message: 'Header Auth is configured for incoming TRMNL polling requests.',
			},
		);
		assert.equal((await testCredential.call({}, { data: {} })).status, 'Error');
	});

	it('emits request data without copying inbound headers into the workflow', async () => {
		const { context } = createWebhookContext({
			parameters: { httpMethod: 'POST', authentication: 'none' },
			headers: { authorization: 'secret-value' },
			body: { source: 'trmnl' },
			query: { screen: 'full' },
			params: { plugin: 'test' },
		});
		const result = await new TrmnlTrigger().webhook.call(context);

		assert.deepEqual(result, {
			workflowData: [
				[
					{
						json: {
							event: 'polling',
							requestMethod: 'POST',
							query: { screen: 'full' },
							params: { plugin: 'test' },
							body: { source: 'trmnl' },
						},
					},
				],
			],
		});
		assert.equal(Object.hasOwn(result.workflowData[0][0].json, 'headers'), false);
	});

	it('accepts a matching Header Auth credential', async () => {
		const { context, response } = createWebhookContext({
			parameters: { httpMethod: 'GET', authentication: 'headerAuth' },
			headers: { 'x-trmnl-token': 'expected-token' },
		});
		const result = await new TrmnlTrigger().webhook.call(context);

		assert.ok(result.workflowData);
		assert.equal(response.ended, false);
	});

	it('rejects an invalid Header Auth value without starting the workflow', async () => {
		const { context, response } = createWebhookContext({
			parameters: { httpMethod: 'GET', authentication: 'headerAuth' },
			headers: { 'x-trmnl-token': 'wrong-token' },
		});
		const result = await new TrmnlTrigger().webhook.call(context);

		assert.deepEqual(result, { noWebhookResponse: true });
		assert.equal(response.statusCode, 401);
		assert.equal(response.headers['WWW-Authenticate'], 'Header realm="TRMNL Trigger"');
		assert.equal(response.ended, true);
	});
});
