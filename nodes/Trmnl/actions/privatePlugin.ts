import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	DEFAULT_PAYLOAD_LIMIT_BYTES,
	DEFAULT_STREAM_LIMIT,
	assignmentsToJsonObject,
	buildPrivatePluginPayload,
	getJsonSizeBytes,
	normalizePrivatePluginEndpoint,
	parseJsonObject,
} from '../helpers/payload';
import { normalizeResponse, unwrapValidationResult } from '../utils';

type TrmnlPrivatePluginCredentials = {
	webhookUrlOrUuid: string;
};

export async function setPrivatePluginContent(
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
			: parseJsonObject(this.getNodeParameter('mergeVariables', itemIndex), 'Merge Variables'),
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

export async function getPrivatePluginContent(
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
