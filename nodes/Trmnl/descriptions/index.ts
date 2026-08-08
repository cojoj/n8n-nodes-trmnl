import type { INodeProperties } from 'n8n-workflow';

import { deviceProperties } from './device';
import { markupFields, markupOperation } from './markup';
import { pluginSettingProperties } from './pluginSetting';
import { privatePluginFields, privatePluginOperation } from './privatePlugin';

const resourceProperty: INodeProperties = {
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
		{
			name: 'Plugin Setting',
			value: 'pluginSetting',
		},
	],
	default: 'privatePlugin',
};

export const trmnlProperties: INodeProperties[] = [
	resourceProperty,
	...deviceProperties,
	...pluginSettingProperties,
	privatePluginOperation,
	markupOperation,
	...privatePluginFields,
	...markupFields,
];
