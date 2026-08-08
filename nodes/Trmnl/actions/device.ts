import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { trmnlAccountApiRequest } from '../transport';
import { normalizeResponse } from '../utils';

export async function listDevices(this: IExecuteFunctions): Promise<IDataObject[]> {
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

export async function getDevice(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
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
