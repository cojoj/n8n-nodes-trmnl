import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	DEFAULT_PAYLOAD_LIMIT_BYTES,
	TRMNL_PLUS_PAYLOAD_LIMIT_BYTES,
	buildPrivatePluginPayload,
	getJsonSizeBytes,
	normalizePrivatePluginEndpoint,
	parseJsonObject,
} from './helpers/payload';

type TrmnlPrivatePluginCredentials = {
	webhookUrlOrUuid: string;
};

export class Trmnl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TRMNL',
		name: 'trmnl',
		icon: { light: 'file:trmnl.svg', dark: 'file:trmnl.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send workflow data to TRMNL private plugins',
		defaults: {
			name: 'TRMNL',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'trmnlPrivatePluginApi',
				required: true,
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Markup',
						value: 'markup',
					},
					{
						name: 'Private Plugin',
						value: 'privatePlugin',
					},
				],
				default: 'privatePlugin',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
					},
				},
				options: [
					{
						name: 'Get Content',
						value: 'getContent',
						description: 'Get the current merge variables for a private plugin',
						action: 'Get private plugin content',
					},
					{
						name: 'Set Content',
						value: 'setContent',
						description:
							'Send merge variables to a private plugin for display on the next device refresh',
						action: 'Set private plugin content',
					},
				],
				default: 'setContent',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['markup'],
					},
				},
				options: [
					{
						name: 'Render',
						value: 'render',
						description: 'Render a Liquid markup template with variables',
						action: 'Render markup',
					},
				],
				default: 'render',
			},
			{
				displayName: 'Merge Variables',
				name: 'mergeVariables',
				type: 'json',
				required: true,
				default:
					'{\n  "title": "Hello from n8n",\n  "message": "TRMNL webhook test works from local n8n.",\n  "items": [\n    {\n      "label": "Status",\n      "value": "Connected"\n    }\n  ]\n}',
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
						operation: ['setContent'],
					},
				},
				description:
					'JSON object available to the TRMNL Private Plugin markup editor as Liquid merge variables',
			},
			{
				displayName:
					'TRMNL devices are pull-based: this sends content to TRMNL, then the device shows it on its next refresh or check-in.',
				name: 'refreshBehaviorNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
						operation: ['setContent'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
						operation: ['setContent'],
					},
				},
				options: [
					{
						displayName: 'Merge Strategy',
						name: 'mergeStrategy',
						type: 'options',
						options: [
							{
								name: 'Replace',
								value: 'replace',
							},
							{
								name: 'Deep Merge',
								value: 'deep_merge',
							},
							{
								name: 'Stream',
								value: 'stream',
							},
						],
						default: 'replace',
						description:
							'How TRMNL should combine this payload with existing merge variables. Stream appends top-level arrays.',
					},
					{
						displayName: 'Payload Limit Bytes',
						name: 'payloadLimitBytes',
						type: 'number',
						default: DEFAULT_PAYLOAD_LIMIT_BYTES,
						typeOptions: {
							minValue: 1,
						},
						description: `Maximum request body size before this node fails locally. TRMNL regular limit is ${DEFAULT_PAYLOAD_LIMIT_BYTES} bytes; TRMNL+ is ${TRMNL_PLUS_PAYLOAD_LIMIT_BYTES} bytes.`,
					},
					{
						displayName: 'Stream Limit',
						name: 'streamLimit',
						type: 'number',
						default: 10,
						typeOptions: {
							minValue: 1,
						},
						description: 'Maximum number of items TRMNL should keep in streamed arrays',
					},
				],
			},
			{
				displayName: 'Markup',
				name: 'markup',
				type: 'string',
				typeOptions: {
					rows: 8,
				},
				required: true,
				default: 'Hello, {{ name }}!',
				displayOptions: {
					show: {
						resource: ['markup'],
						operation: ['render'],
					},
				},
				description: 'Liquid markup to render',
			},
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				required: true,
				default: '{\n  "name": "World"\n}',
				displayOptions: {
					show: {
						resource: ['markup'],
						operation: ['render'],
					},
				},
				description: 'JSON object to use while rendering the markup',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				let responseData: IDataObject;

				if (resource === 'privatePlugin' && operation === 'setContent') {
					responseData = await setPrivatePluginContent.call(this, itemIndex);
				} else if (resource === 'privatePlugin' && operation === 'getContent') {
					responseData = await getPrivatePluginContent.call(this, itemIndex);
				} else if (resource === 'markup' && operation === 'render') {
					responseData = await renderMarkup.call(this, itemIndex);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported TRMNL operation: ${resource}.${operation}`,
						{ itemIndex },
					);
				}

				returnData.push({
					json: responseData,
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error',
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (isApiError(error)) {
					throw new NodeApiError(this.getNode(), error, { itemIndex });
				}

				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}

async function setPrivatePluginContent(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = (await this.getCredentials(
		'trmnlPrivatePluginApi',
		itemIndex,
	)) as TrmnlPrivatePluginCredentials;
	const url = unwrapValidationResult(
		normalizePrivatePluginEndpoint(credentials.webhookUrlOrUuid),
		this,
		itemIndex,
	);
	const mergeVariables = unwrapValidationResult(
		parseJsonObject(
			this.getNodeParameter('mergeVariables', itemIndex),
			'Merge Variables',
		),
		this,
		itemIndex,
	);
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const body = unwrapValidationResult(
		buildPrivatePluginPayload(mergeVariables, options),
		this,
		itemIndex,
	);

	const payloadSizeBytes = getJsonSizeBytes(body);
	const payloadLimitBytes = Number(options.payloadLimitBytes ?? DEFAULT_PAYLOAD_LIMIT_BYTES);

	if (payloadSizeBytes > payloadLimitBytes) {
		throw new NodeOperationError(
			this.getNode(),
			`TRMNL payload is ${payloadSizeBytes} bytes, which exceeds the configured ${payloadLimitBytes} byte limit.`,
			{ itemIndex },
		);
	}

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'trmnlPrivatePluginApi',
		{
			method: 'POST',
			url,
			headers: {
				'Content-Type': 'application/json',
			},
			body,
			json: true,
		} as IHttpRequestOptions,
	);

	return {
		success: true,
		payloadSizeBytes,
		mergeVariables,
		mergeStrategy: body.merge_strategy ?? 'replace',
		response: normalizeResponse(response),
	};
}

async function getPrivatePluginContent(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = (await this.getCredentials(
		'trmnlPrivatePluginApi',
		itemIndex,
	)) as TrmnlPrivatePluginCredentials;
	const url = unwrapValidationResult(
		normalizePrivatePluginEndpoint(credentials.webhookUrlOrUuid),
		this,
		itemIndex,
	);
	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'trmnlPrivatePluginApi',
		{
			method: 'GET',
			url,
			json: true,
		} as IHttpRequestOptions,
	);

	return {
		success: true,
		response: normalizeResponse(response),
	};
}

async function renderMarkup(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const markup = this.getNodeParameter('markup', itemIndex) as string;
	const variables = unwrapValidationResult(
		parseJsonObject(this.getNodeParameter('variables', itemIndex), 'Variables'),
		this,
		itemIndex,
	);
	const response = await this.helpers.httpRequest({
		method: 'POST',
		url: 'https://trmnl.com/api/markup',
		headers: {
			'Content-Type': 'application/json',
		},
		body: {
			markup,
			variables,
		},
		json: true,
	} as IHttpRequestOptions);

	return {
		success: true,
		response: normalizeResponse(response),
	};
}

function normalizeResponse(response: unknown): IDataObject {
	if (response && typeof response === 'object' && !Array.isArray(response)) {
		return response as IDataObject;
	}

	return {
		data: response as IDataObject[string],
	};
}

function isApiError(error: unknown): error is JsonObject {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const maybeApiError = error as { response?: unknown; statusCode?: unknown; httpCode?: unknown };

	return Boolean(maybeApiError.response ?? maybeApiError.statusCode ?? maybeApiError.httpCode);
}

function unwrapValidationResult<T>(
	result: { ok: true; value: T } | { ok: false; error: string },
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): T {
	if (result.ok) {
		return result.value;
	}

	throw new NodeOperationError(executeFunctions.getNode(), result.error, { itemIndex });
}
