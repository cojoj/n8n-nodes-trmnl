import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { trmnlAccountApiRequest } from '../transport';
import { normalizeResponse } from '../utils';

function getDeviceId(executeFunctions: IExecuteFunctions, itemIndex: number): number {
	const value = String(executeFunctions.getNodeParameter('deviceId', itemIndex)).trim();
	const numericValue = Number(value);

	if (!/^\d+$/.test(value) || !Number.isSafeInteger(numericValue) || numericValue <= 0) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Device ID must be a positive integer.', {
			itemIndex,
		});
	}

	return numericValue;
}

function getBooleanParameter(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	name: string,
	displayName: string,
): boolean {
	const value = executeFunctions.getNodeParameter(name, itemIndex);

	if (typeof value !== 'boolean') {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`${displayName} must resolve to a boolean.`,
			{ itemIndex },
		);
	}

	return value;
}

function getMinuteOfDay(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	name: string,
	displayName: string,
): number {
	const value = executeFunctions.getNodeParameter(name, itemIndex);
	const numericValue = Number(value);

	if (
		value === '' ||
		!Number.isInteger(numericValue) ||
		numericValue < 0 ||
		numericValue > 1439
	) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`${displayName} must be an integer from 0 to 1439.`,
			{ itemIndex },
		);
	}

	return numericValue;
}

export async function listDevices(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const response = await trmnlAccountApiRequest.call(
		this,
		{
			method: 'GET',
			url: '/api/devices',
		},
		{
			itemIndex,
			operation: 'list',
			operationLabel: 'listing Devices',
			resource: 'device',
			target: 'Device list',
		},
	);
	const normalizedResponse = normalizeResponse(response);

	if (!Array.isArray(normalizedResponse.data)) {
		return [normalizedResponse];
	}

	return normalizedResponse.data.map((device) => normalizeResponse(device));
}

export async function getDevice(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const deviceId = getDeviceId(this, itemIndex);

	const response = await trmnlAccountApiRequest.call(
		this,
		{
			method: 'GET',
			url: `/api/devices/${deviceId}`,
		},
		{
			itemIndex,
			operation: 'get',
			operationLabel: 'getting a Device',
			resource: 'device',
			target: 'Device',
		},
	);
	const normalizedResponse = normalizeResponse(response);
	const device = normalizedResponse.data;

	return device && typeof device === 'object' && !Array.isArray(device)
		? (device as IDataObject)
		: normalizedResponse;
}

export async function updateDeviceSleepMode(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const deviceId = getDeviceId(this, itemIndex);
	const sleepModeEnabled = getBooleanParameter(
		this,
		itemIndex,
		'sleepModeEnabled',
		'Sleep Mode Enabled',
	);
	const requestedSettings: IDataObject = {
		sleep_mode_enabled: sleepModeEnabled,
	};

	if (sleepModeEnabled) {
		requestedSettings.sleep_start_time = getMinuteOfDay(
			this,
			itemIndex,
			'sleepStartTime',
			'Sleep Start',
		);
		requestedSettings.sleep_end_time = getMinuteOfDay(
			this,
			itemIndex,
			'sleepEndTime',
			'Sleep End',
		);
	}

	const response = await trmnlAccountApiRequest.call(
		this,
		{
			method: 'PATCH',
			url: `/api/devices/${deviceId}`,
			headers: {
				'Content-Type': 'application/json',
			},
			body: requestedSettings,
		},
		{
			itemIndex,
			operation: 'updateSleepMode',
			operationLabel: 'updating a Device sleep schedule',
			resource: 'device',
			target: 'Device',
			write: true,
		},
	);

	return {
		operation: 'updateSleepMode',
		success: true,
		deviceId,
		requestedSettings,
		response: normalizeResponse(response),
	};
}
