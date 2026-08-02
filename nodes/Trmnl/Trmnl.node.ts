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
	DEFAULT_STREAM_LIMIT,
	TRMNL_PLUS_PAYLOAD_LIMIT_BYTES,
	assignmentsToJsonObject,
	buildPrivatePluginPayload,
	getJsonSizeBytes,
	normalizePrivatePluginEndpoint,
	parseJsonObject,
} from './helpers/payload';

type TrmnlPrivatePluginCredentials = {
	webhookUrlOrUuid: string;
};

const TRMNL_ACCOUNT_API_BASE_URL = 'https://trmnl.com';

export class Trmnl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TRMNL',
		name: 'trmnl',
		icon: { light: 'file:trmnl.svg', dark: 'file:trmnl.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send workflow data to TRMNL and discover account devices',
		defaults: {
			name: 'TRMNL',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'trmnlAccountApi',
				required: true,
				displayOptions: {
					show: {
						resource: ['device'],
					},
				},
			},
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
						name: 'Device',
						value: 'device',
					},
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
						resource: ['device'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a device from the authenticated TRMNL account',
						action: 'Get a device',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List devices in the authenticated TRMNL account',
						action: 'List devices',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Device ID',
				name: 'deviceId',
				type: 'string',
				required: true,
				default: '',
				placeholder: '123456',
				displayOptions: {
					show: {
						resource: ['device'],
						operation: ['get'],
					},
				},
				description: 'Numeric ID returned by the Device List operation',
			},
			{
				displayName:
					'Device operations read account metadata only. They do not push content or refresh hardware.',
				name: 'deviceReadOnlyNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['device'],
					},
				},
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
				displayName: 'Specify Merge Variables',
				name: 'mergeVariablesMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Using Fields Below',
						value: 'fields',
						description: 'Add merge variables one by one',
					},
					{
						name: 'Using JSON',
						value: 'json',
						description: 'Provide all merge variables as one JSON object',
					},
				],
				default: 'json',
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
						operation: ['setContent'],
					},
				},
				description: 'How to define the merge variables sent to TRMNL',
			},
			{
				displayName: 'Merge Variables',
				name: 'mergeVariableAssignments',
				type: 'assignmentCollection',
				default: { assignments: [] },
				typeOptions: {
					assignment: {
						defaultType: 'string',
					},
				},
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
						operation: ['setContent'],
						mergeVariablesMode: ['fields'],
					},
				},
				description:
					'Data to store for the Private Plugin. Each name becomes a top-level Liquid variable.',
			},
			{
				displayName: 'JSON',
				name: 'mergeVariables',
				type: 'json',
				required: true,
				default:
					'{\n  "title": "Hello from n8n",\n  "message": "TRMNL webhook test works from local n8n.",\n  "items": [\n    {\n      "label": "Status",\n      "value": "Connected"\n    }\n  ]\n}',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
						operation: ['setContent'],
					},
					hide: {
						mergeVariablesMode: ['fields'],
					},
				},
				description:
					'Data to store for the Private Plugin. Each top-level key becomes a Liquid variable in the TRMNL markup editor.',
			},
			{
				displayName:
					'TRMNL displays the new content on the device\'s next scheduled or manual refresh.',
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
				displayName: 'Merge Strategy',
				name: 'mergeStrategy',
				type: 'options',
				options: [
					{
						name: 'Deep Merge',
						value: 'deep_merge',
						description: 'Update nested values while preserving other stored values',
					},
					{
						name: 'Replace',
						value: 'replace',
						description: 'Replace all stored merge variables with this payload',
					},
					{
						name: 'Stream',
						value: 'stream',
						description:
							'Append values to top-level arrays and trim older entries; include every top-level key to retain',
					},
				],
				default: 'replace',
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
						operation: ['setContent'],
					},
				},
				description:
					'How to combine this payload with the merge variables already stored by TRMNL',
			},
			{
				displayName: 'Stream Limit',
				name: 'streamLimit',
				type: 'number',
				default: DEFAULT_STREAM_LIMIT,
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
						operation: ['setContent'],
						mergeStrategy: ['stream'],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				description:
					'Maximum number of values retained in each top-level array included in the Stream payload',
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
						displayName: 'Payload Limit Bytes',
						name: 'payloadLimitBytes',
						type: 'number',
						default: DEFAULT_PAYLOAD_LIMIT_BYTES,
						typeOptions: {
							minValue: 1,
						},
						description: `Maximum request body size before this node fails locally. TRMNL regular limit is ${DEFAULT_PAYLOAD_LIMIT_BYTES} bytes; TRMNL+ is ${TRMNL_PLUS_PAYLOAD_LIMIT_BYTES} bytes.`,
					},
				],
			},
			{
				displayName: 'Liquid Markup',
				name: 'markup',
				type: 'string',
				noDataExpression: true,
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
				description:
					'Liquid markup sent to TRMNL unchanged. Use Variables below for dynamic n8n data.',
			},
			{
				displayName: 'Specify Variables',
				name: 'variablesMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Using Fields Below',
						value: 'fields',
						description: 'Add Liquid variables one by one',
					},
					{
						name: 'Using JSON',
						value: 'json',
						description: 'Provide all Liquid variables as one JSON object',
					},
				],
				default: 'json',
				displayOptions: {
					show: {
						resource: ['markup'],
						operation: ['render'],
					},
				},
				description: 'How to define the variables available to the Liquid markup',
			},
			{
				displayName: 'Variables',
				name: 'variableAssignments',
				type: 'assignmentCollection',
				default: { assignments: [] },
				typeOptions: {
					assignment: {
						defaultType: 'string',
					},
				},
				displayOptions: {
					show: {
						resource: ['markup'],
						operation: ['render'],
						variablesMode: ['fields'],
					},
				},
				description:
					'Each name becomes a variable available to the Liquid markup. Values support n8n expressions.',
			},
			{
				displayName: 'JSON',
				name: 'variables',
				type: 'json',
				required: true,
				default: '{\n  "name": "World"\n}',
				typeOptions: {
					rows: 6,
				},
				displayOptions: {
					show: {
						resource: ['markup'],
						operation: ['render'],
					},
					hide: {
						variablesMode: ['fields'],
					},
				},
				description:
					'Object available to the Liquid markup while TRMNL renders it. n8n expressions are supported here.',
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

				if (resource === 'device' && operation === 'list') {
					const devices = await listDevices.call(this);

					returnData.push(
						...devices.map((device) => ({
							json: device,
							pairedItem: { item: itemIndex },
						})),
					);
					continue;
				}

				let responseData: IDataObject;

				if (resource === 'device' && operation === 'get') {
					responseData = await getDevice.call(this, itemIndex);
				} else if (resource === 'privatePlugin' && operation === 'setContent') {
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

async function listDevices(this: IExecuteFunctions): Promise<IDataObject[]> {
	const response = await trmnlAccountApiRequest.call(this, {
		method: 'GET',
		url: '/api/devices',
	});
	const normalizedResponse = normalizeResponse(response);

	if (!Array.isArray(normalizedResponse.data)) {
		return [normalizedResponse];
	}

	return normalizedResponse.data.map((device) => normalizeResponse(device));
}

async function getDevice(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const deviceId = String(this.getNodeParameter('deviceId', itemIndex)).trim();
	const numericDeviceId = Number(deviceId);

	if (!/^\d+$/.test(deviceId) || !Number.isSafeInteger(numericDeviceId) || numericDeviceId <= 0) {
		throw new NodeOperationError(this.getNode(), 'Device ID must be a positive integer.', {
			itemIndex,
		});
	}

	const response = await trmnlAccountApiRequest.call(this, {
		method: 'GET',
		url: `/api/devices/${numericDeviceId}`,
	});
	const normalizedResponse = normalizeResponse(response);
	const device = normalizedResponse.data;

	return device && typeof device === 'object' && !Array.isArray(device)
		? (device as IDataObject)
		: normalizedResponse;
}

async function trmnlAccountApiRequest(
	this: IExecuteFunctions,
	options: IHttpRequestOptions,
): Promise<unknown> {
	return await this.helpers.httpRequestWithAuthentication.call(this, 'trmnlAccountApi', {
		...options,
		url: `${TRMNL_ACCOUNT_API_BASE_URL}${options.url}`,
		json: true,
	} as IHttpRequestOptions);
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
	const nodeParameters = this.getNode().parameters;
	const mergeVariablesMode = Object.prototype.hasOwnProperty.call(
		nodeParameters,
		'mergeVariablesMode',
	)
		? (this.getNodeParameter('mergeVariablesMode', itemIndex) as string)
		: 'json';
	const mergeVariables = unwrapValidationResult(
		mergeVariablesMode === 'fields'
			? assignmentsToJsonObject(
					this.getNodeParameter('mergeVariableAssignments', itemIndex, { assignments: [] }),
				)
			: parseJsonObject(
					this.getNodeParameter('mergeVariables', itemIndex),
					'Merge Variables',
				),
		this,
		itemIndex,
	);
	const options = {
		...(this.getNodeParameter('options', itemIndex, {}) as IDataObject),
	};
	// Workflows created before these controls became top-level fields stored them in Options.
	if (Object.prototype.hasOwnProperty.call(nodeParameters, 'mergeStrategy')) {
		const mergeStrategy = this.getNodeParameter('mergeStrategy', itemIndex) as string;
		options.mergeStrategy = mergeStrategy;

		if (mergeStrategy === 'stream') {
			options.streamLimit = this.getNodeParameter(
				'streamLimit',
				itemIndex,
				DEFAULT_STREAM_LIMIT,
			) as number;
		} else {
			delete options.streamLimit;
		}
	}
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
		operation: 'setContent',
		success: true,
		payloadSizeBytes,
		payloadLimitBytes,
		mergeVariables,
		mergeStrategy: body.merge_strategy ?? 'replace',
		...(body.stream_limit === undefined ? {} : { streamLimit: body.stream_limit }),
		deviceUpdate: 'next_refresh',
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
		operation: 'getContent',
		success: true,
		response: normalizeResponse(response),
	};
}

async function renderMarkup(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const markup = this.getNodeParameter('markup', itemIndex) as string;
	const nodeParameters = this.getNode().parameters;
	const variablesMode = Object.prototype.hasOwnProperty.call(nodeParameters, 'variablesMode')
		? (this.getNodeParameter('variablesMode', itemIndex) as string)
		: 'json';
	const variables = unwrapValidationResult(
		variablesMode === 'fields'
			? assignmentsToJsonObject(
					this.getNodeParameter('variableAssignments', itemIndex, { assignments: [] }),
					'Variables',
				)
			: parseJsonObject(this.getNodeParameter('variables', itemIndex), 'Variables'),
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
	const normalizedResponse = normalizeResponse(response);

	return {
		operation: 'render',
		success: true,
		variables,
		...(Object.prototype.hasOwnProperty.call(normalizedResponse, 'data')
			? { rendered: normalizedResponse.data }
			: {}),
		response: normalizedResponse,
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
