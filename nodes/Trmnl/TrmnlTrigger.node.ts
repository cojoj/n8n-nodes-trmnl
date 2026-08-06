import { timingSafeEqual } from 'node:crypto';

import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IHookFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

type HttpHeaderAuthCredentials = {
	headerName: string;
	headerValue: string;
};

export class TrmnlTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TRMNL Trigger',
		name: 'trmnlTrigger',
		icon: { light: 'file:trmnl.svg', dark: 'file:trmnl.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: 'Polling',
		description: 'Starts the workflow when TRMNL requests Private Plugin data',
		eventTriggerDescription: 'Waiting for TRMNL to request Private Plugin data',
		activationMessage: 'TRMNL can now call the production polling URL.',
		defaults: {
			name: 'TRMNL Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'trmnlPollingHeaderAuthApi',
				required: true,
				testedBy: 'testPollingHeaderAuthCredential',
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: '={{$parameter["httpMethod"]}}',
				responseMode: 'lastNode',
				responseData: 'firstEntryJson',
				path: 'poll',
			},
		],
		properties: [
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'POST',
						value: 'POST',
					},
				],
				default: 'GET',
				description: 'Must match the Polling Verb configured in the TRMNL Private Plugin',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'Header Auth is recommended because TRMNL can send a custom Polling Header',
			},
			{
				displayName:
					"Paste this node's production URL into the TRMNL Polling URL field. The workflow must be active and publicly reachable over HTTPS.",
				name: 'pollingSetupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName:
					'TRMNL waits for this workflow to finish. Keep the path fast and make the final node output the root JSON object used by the markup.',
				name: 'synchronousPollingNotice',
				type: 'notice',
				default: '',
			},
		],
	};

	methods = {
		credentialTest: {
			async testPollingHeaderAuthCredential(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted<ICredentialDataDecryptedObject>,
			): Promise<INodeCredentialTestResult> {
				const headerName = String(credential.data?.headerName ?? '').trim();
				const headerValue = String(credential.data?.headerValue ?? '');

				if (!headerName || !headerValue) {
					return {
						status: 'Error',
						message: 'Enter both a Polling Header name and value.',
					};
				}

				return {
					status: 'OK',
					message: 'Header Auth is configured for incoming TRMNL polling requests.',
				};
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		if (!(await authenticateRequest.call(this))) {
			const response = this.getResponseObject();

			response.status(401).setHeader('WWW-Authenticate', 'Header realm="TRMNL Trigger"');
			response.end();

			return { noWebhookResponse: true };
		}

		const request = this.getRequestObject();
		const item: INodeExecutionData = {
			json: {
				event: 'polling',
				requestMethod: request.method,
				query: this.getQueryData() as IDataObject,
				params: this.getParamsData() as IDataObject,
				body: this.getBodyData(),
			},
		};

		return {
			workflowData: [[item]],
		};
	}
}

async function authenticateRequest(this: IWebhookFunctions): Promise<boolean> {
	const authentication = this.getNodeParameter('authentication', 'none') as string;

	if (authentication === 'none') {
		return true;
	}

	const credentials = (await this.getCredentials(
		'trmnlPollingHeaderAuthApi',
	)) as HttpHeaderAuthCredentials;
	const headerName = String(credentials.headerName ?? '')
		.trim()
		.toLowerCase();
	const expectedValue = String(credentials.headerValue ?? '');
	const actualValue = headerName ? this.getHeaderData()[headerName] : undefined;

	return (
		typeof actualValue === 'string' &&
		headerName.length > 0 &&
		expectedValue.length > 0 &&
		securelyEqual(actualValue, expectedValue)
	);
}

function securelyEqual(actualValue: string, expectedValue: string): boolean {
	const actual = Buffer.from(actualValue);
	const expected = Buffer.from(expectedValue);

	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
