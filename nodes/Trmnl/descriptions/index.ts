import type { INodeProperties } from 'n8n-workflow';

import { deviceProperties } from './device';
import { markupFields, markupOperation } from './markup';
import { playlistItemProperties } from './playlistItem';
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
			name: 'Playlist Item',
			value: 'playlistItem',
		},
		{
			name: 'Plugin Setting',
			value: 'pluginSetting',
		},
		{
			name: 'Private Plugin',
			value: 'privatePlugin',
		},
	],
	default: 'privatePlugin',
};

export const trmnlProperties: INodeProperties[] = [
	resourceProperty,
	...deviceProperties,
	...playlistItemProperties,
	...pluginSettingProperties,
	privatePluginOperation,
	markupOperation,
	...privatePluginFields,
	...markupFields,
];
