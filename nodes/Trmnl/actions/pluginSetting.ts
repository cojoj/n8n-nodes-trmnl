import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { assignmentsToJsonObject, parseJsonObject } from '../helpers/payload';
import { trmnlAccountApiRequest } from '../transport';
import { normalizeResponse, unwrapValidationResult } from '../utils';

const PLUGIN_SETTING_UUID_PATTERN = /^(?=.*[A-Za-z0-9])[A-Za-z0-9_-]+$/;
const MARKUP_SIZE_PATTERN = /^(?=.*[A-Za-z0-9])[A-Za-z0-9_-]+$/;

function validatePositiveInteger(value: string): boolean {
	const numericValue = Number(value);

	return /^\d+$/.test(value) && Number.isSafeInteger(numericValue) && numericValue > 0;
}

function getPluginSettingUuid(executeFunctions: IExecuteFunctions, itemIndex: number): string {
	const value = String(executeFunctions.getNodeParameter('pluginSettingUuid', itemIndex)).trim();

	if (!PLUGIN_SETTING_UUID_PATTERN.test(value)) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Plugin Setting UUID may only contain letters, numbers, underscores, or hyphens.',
			{ itemIndex },
		);
	}

	return value;
}

function getMarkupSize(executeFunctions: IExecuteFunctions, itemIndex: number): string {
	const value = String(executeFunctions.getNodeParameter('markupSize', itemIndex)).trim();

	if (!MARKUP_SIZE_PATTERN.test(value)) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Markup Size may only contain letters, numbers, underscores, or hyphens.',
			{ itemIndex },
		);
	}

	return value;
}

function getPluginSettingId(executeFunctions: IExecuteFunctions, itemIndex: number): string {
	const value = String(executeFunctions.getNodeParameter('pluginSettingId', itemIndex)).trim();

	const isNumeric = /^\d+$/.test(value);

	if (
		(isNumeric && !validatePositiveInteger(value)) ||
		(!isNumeric && !PLUGIN_SETTING_UUID_PATTERN.test(value))
	) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Plugin Setting ID must be a positive integer or a UUID containing only letters, numbers, underscores, or hyphens.',
			{ itemIndex },
		);
	}

	return value;
}

function extractMarkupContent(response: unknown): string | undefined {
	if (typeof response === 'string') {
		return response;
	}

	if (!response || typeof response !== 'object' || Array.isArray(response)) {
		return undefined;
	}

	const responseObject = response as Record<string, unknown>;
	const data = responseObject.data;

	if (data && typeof data === 'object' && !Array.isArray(data)) {
		const dataObject = data as Record<string, unknown>;

		if (typeof dataObject.markup === 'string') {
			return dataObject.markup;
		}

		if (typeof dataObject.content === 'string') {
			return dataObject.content;
		}
	}

	if (typeof responseObject.markup === 'string') {
		return responseObject.markup;
	}

	if (typeof responseObject.content === 'string') {
		return responseObject.content;
	}

	return undefined;
}

export async function listPluginSettings(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const pluginId = String(this.getNodeParameter('pluginId', itemIndex, '')).trim();
	const options: { method: 'GET'; url: string; qs?: IDataObject } = {
		method: 'GET',
		url: '/api/plugin_settings',
	};

	if (pluginId) {
		if (pluginId !== 'calendars' && !validatePositiveInteger(pluginId)) {
			throw new NodeOperationError(
				this.getNode(),
				'Plugin ID must be a positive integer or the documented value "calendars".',
				{ itemIndex },
			);
		}

		options.qs = { plugin_id: pluginId };
	}

	const response = await trmnlAccountApiRequest.call(this, options);
	const normalizedResponse = normalizeResponse(response);

	if (!Array.isArray(normalizedResponse.data)) {
		return [normalizedResponse];
	}

	return normalizedResponse.data.map((pluginSetting) => normalizeResponse(pluginSetting));
}

export async function getPluginSettingDetails(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const pluginSettingUuid = getPluginSettingUuid(this, itemIndex);
	const response = await trmnlAccountApiRequest.call(this, {
		method: 'GET',
		url: `/api/plugin_settings/${encodeURIComponent(pluginSettingUuid)}/details`,
	});

	return normalizeResponse(response);
}

export async function getPluginSettingData(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const pluginSettingId = getPluginSettingId(this, itemIndex);
	const response = await trmnlAccountApiRequest.call(this, {
		method: 'GET',
		url: `/api/plugin_settings/${encodeURIComponent(pluginSettingId)}/data`,
	});

	return normalizeResponse(response);
}

export async function updatePluginSettingData(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const pluginSettingId = getPluginSettingId(this, itemIndex);
	const dataMode = this.getNodeParameter('pluginSettingDataMode', itemIndex, 'json') as string;
	const mergeVariables = unwrapValidationResult(
		dataMode === 'fields'
			? assignmentsToJsonObject(
					this.getNodeParameter('pluginSettingDataAssignments', itemIndex, {
						assignments: [],
					}),
					'Merge Variables',
				)
			: parseJsonObject(this.getNodeParameter('pluginSettingData', itemIndex), 'Merge Variables'),
		this,
		itemIndex,
	);
	const response = await trmnlAccountApiRequest.call(this, {
		method: 'POST',
		url: `/api/plugin_settings/${encodeURIComponent(pluginSettingId)}/data`,
		headers: {
			'Content-Type': 'application/json',
		},
		body: {
			merge_variables: mergeVariables,
		},
	});

	return {
		operation: 'updateData',
		success: true,
		pluginSettingId,
		response: normalizeResponse(response),
	};
}

export async function readPluginSettingMarkup(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const pluginSettingUuid = getPluginSettingUuid(this, itemIndex);
	const size = getMarkupSize(this, itemIndex);
	const response = await trmnlAccountApiRequest.call(this, {
		method: 'GET',
		url: `/api/plugin_settings/${encodeURIComponent(pluginSettingUuid)}/markup/${encodeURIComponent(size)}`,
		json: false,
	});
	const content = extractMarkupContent(response);

	if (content === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'TRMNL returned markup in an unsupported response shape.',
			{ itemIndex },
		);
	}

	return {
		operation: 'readMarkup',
		success: true,
		pluginSettingUuid,
		size,
		content,
		response: normalizeResponse(response),
	};
}

export async function writePluginSettingMarkup(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const pluginSettingUuid = getPluginSettingUuid(this, itemIndex);
	const size = getMarkupSize(this, itemIndex);
	const content = this.getNodeParameter('pluginSettingMarkup', itemIndex) as string;
	const response = await trmnlAccountApiRequest.call(this, {
		method: 'PUT',
		url: `/api/plugin_settings/${encodeURIComponent(pluginSettingUuid)}/markup/${encodeURIComponent(size)}`,
		headers: {
			'Content-Type': 'application/json',
		},
		body: { content },
	});

	return {
		operation: 'writeMarkup',
		success: true,
		pluginSettingUuid,
		size,
		response: normalizeResponse(response),
	};
}
