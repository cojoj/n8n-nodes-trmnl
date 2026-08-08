import type { INodeProperties } from 'n8n-workflow';

export const pluginSettingProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
			},
		},
		options: [
			{
				name: 'Get Data',
				value: 'getData',
				description: 'Get the current data returned for a plugin setting',
				action: 'Get plugin setting data',
			},
			{
				name: 'Get Details',
				value: 'getDetails',
				description: 'Get plugin setting details and available markup sizes',
				action: 'Get plugin setting details',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List plugin settings returned by the authenticated TRMNL account',
				action: 'List plugin settings',
			},
		],
		default: 'list',
	},
	{
		displayName: 'Plugin ID',
		name: 'pluginId',
		type: 'string',
		default: '',
		placeholder: '123 or calendars',
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['list'],
			},
		},
		description:
			'Optional plugin ID to filter by, or "calendars" for the documented calendar filter',
	},
	{
		displayName: 'Plugin Setting UUID',
		name: 'pluginSettingUuid',
		type: 'string',
		required: true,
		default: '',
		placeholder: '00000000-0000-4000-8000-000000000000',
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['getDetails'],
			},
		},
		description: 'Plugin Setting UUID, which can be supplied with an n8n expression',
	},
	{
		displayName: 'Plugin Setting ID or UUID',
		name: 'pluginSettingId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '123 or 00000000-0000-4000-8000-000000000000',
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['getData'],
			},
		},
		description: 'Numeric Plugin Setting ID or UUID, which can be supplied with an n8n expression',
	},
	{
		displayName:
			'Plugin Setting operations in this release are read-only. They do not change data, markup, playlists, or devices. List reflects only the records returned by TRMNL and is not documented as a complete inventory.',
		name: 'pluginSettingReadOnlyNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
			},
		},
	},
];
