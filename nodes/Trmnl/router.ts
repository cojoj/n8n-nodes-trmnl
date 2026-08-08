import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getDevice, listDevices } from './actions/device';
import { renderMarkup } from './actions/markup';
import {
	getPluginSettingData,
	getPluginSettingDetails,
	listPluginSettings,
} from './actions/pluginSetting';
import { getPrivatePluginContent, setPrivatePluginContent } from './actions/privatePlugin';

export async function routeTrmnlOperation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const resource = this.getNodeParameter('resource', itemIndex) as string;
	const operation = this.getNodeParameter('operation', itemIndex) as string;

	if (resource === 'device' && operation === 'list') {
		return await listDevices.call(this);
	}

	if (resource === 'device' && operation === 'get') {
		return [await getDevice.call(this, itemIndex)];
	}

	if (resource === 'pluginSetting' && operation === 'list') {
		return await listPluginSettings.call(this, itemIndex);
	}

	if (resource === 'pluginSetting' && operation === 'getDetails') {
		return [await getPluginSettingDetails.call(this, itemIndex)];
	}

	if (resource === 'pluginSetting' && operation === 'getData') {
		return [await getPluginSettingData.call(this, itemIndex)];
	}

	if (resource === 'privatePlugin' && operation === 'setContent') {
		return [await setPrivatePluginContent.call(this, itemIndex)];
	}

	if (resource === 'privatePlugin' && operation === 'getContent') {
		return [await getPrivatePluginContent.call(this, itemIndex)];
	}

	if (resource === 'markup' && operation === 'render') {
		return [await renderMarkup.call(this, itemIndex)];
	}

	throw new NodeOperationError(
		this.getNode(),
		`Unsupported TRMNL operation: ${resource}.${operation}`,
		{ itemIndex },
	);
}
