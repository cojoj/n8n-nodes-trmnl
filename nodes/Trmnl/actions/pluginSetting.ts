import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { trmnlAccountApiRequest } from '../transport';
import { normalizeResponse } from '../utils';

const PLUGIN_SETTING_UUID_PATTERN = /^(?=.*[A-Za-z0-9])[A-Za-z0-9_-]+$/;

function validatePositiveInteger(value: string): boolean {
	const numericValue = Number(value);

	return /^\d+$/.test(value) && Number.isSafeInteger(numericValue) && numericValue > 0;
}

function getPluginSettingUuid(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): string {
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

function getPluginSettingId(executeFunctions: IExecuteFunctions, itemIndex: number): string {
	const value = String(executeFunctions.getNodeParameter('pluginSettingId', itemIndex)).trim();

	const isNumeric = /^\d+$/.test(value);

	if ((isNumeric && !validatePositiveInteger(value)) || (!isNumeric && !PLUGIN_SETTING_UUID_PATTERN.test(value))) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Plugin Setting ID must be a positive integer or a UUID containing only letters, numbers, underscores, or hyphens.',
			{ itemIndex },
		);
	}

	return value;
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
