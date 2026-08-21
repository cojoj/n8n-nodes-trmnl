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
			{
				name: 'Read Markup',
				value: 'readMarkup',
				description: 'Read the saved Liquid markup for a Plugin Setting size',
				action: 'Read plugin setting markup',
			},
			{
				name: 'Update Data',
				value: 'updateData',
				description: 'Submit Account API data to a supported Plugin Setting',
				action: 'Update plugin setting data',
			},
			{
				name: 'Write Markup',
				value: 'writeMarkup',
				description: 'Save Liquid markup for a Plugin Setting size',
				action: 'Write plugin setting markup',
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
				operation: ['getDetails', 'readMarkup', 'writeMarkup'],
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
				operation: ['getData', 'updateData'],
			},
		},
		description: 'Numeric Plugin Setting ID or UUID, which can be supplied with an n8n expression',
	},
	{
		displayName: 'Specify Merge Variables',
		name: 'pluginSettingDataMode',
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
				resource: ['pluginSetting'],
				operation: ['updateData'],
			},
		},
		description: 'How to define the merge variables stored for this Plugin Setting',
	},
	{
		displayName: 'Merge Variables',
		name: 'pluginSettingDataAssignments',
		type: 'assignmentCollection',
		default: { assignments: [] },
		typeOptions: {
			assignment: {
				defaultType: 'string',
			},
		},
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['updateData'],
				pluginSettingDataMode: ['fields'],
			},
		},
		description: 'Server-side Plugin Setting data. Values support n8n expressions.',
	},
	{
		displayName: 'JSON',
		name: 'pluginSettingData',
		type: 'json',
		required: true,
		default: '{\n  "status": "ready"\n}',
		typeOptions: {
			rows: 8,
		},
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['updateData'],
			},
			hide: {
				pluginSettingDataMode: ['fields'],
			},
		},
		description:
			'Target-specific merge variables. Calendar writes from TRMNL Companion use an events array. n8n expressions are supported here.',
	},
	{
		displayName: 'Markup Size',
		name: 'markupSize',
		type: 'string',
		required: true,
		default: 'markup_full',
		placeholder: 'markup_full',
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['readMarkup', 'writeMarkup'],
			},
		},
		description:
			'Markup size returned by Get Details when available, or another size supported by TRMNL. n8n expressions are supported.',
	},
	{
		displayName: 'Liquid Markup',
		name: 'pluginSettingMarkup',
		type: 'string',
		noDataExpression: true,
		typeOptions: {
			rows: 12,
		},
		required: true,
		default: '<div class="layout">{{ message }}</div>',
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['writeMarkup'],
			},
		},
		description:
			'Liquid markup saved to TRMNL unchanged. This field intentionally does not evaluate n8n expressions.',
	},
	{
		displayName:
			'List, Get Details, Get Data, and Read Markup are read-only. List reflects only the records returned by TRMNL and is not documented as a complete inventory.',
		name: 'pluginSettingReadOnlyNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['list', 'getDetails', 'getData', 'readMarkup'],
			},
		},
	},
	{
		displayName:
			'Update Data works only for Plugin Settings and merge-variable schemas supported by TRMNL. A successful response acknowledges the request; verify persistence with Get Data. Calendar writes require the Companion/iPhone App provider and an events array. For a Webhook Private Plugin, use Private Plugin → Set/Get Content instead. This does not Force Refresh or prove delivery to a physical device.',
		name: 'pluginSettingDataWriteNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['updateData'],
			},
		},
	},
	{
		displayName:
			'Write Markup changes the template used on future TRMNL renders. Saving markup does not Force Refresh or prove a physical-device update.',
		name: 'pluginSettingMarkupWriteNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['pluginSetting'],
				operation: ['writeMarkup'],
			},
		},
	},
];
