import type { INodeProperties } from 'n8n-workflow';

export const deviceProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['device'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a device from the authenticated TRMNL account',
				action: 'Get a device',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List devices in the authenticated TRMNL account',
				action: 'List devices',
			},
		],
		default: 'list',
	},
	{
		displayName: 'Device ID',
		name: 'deviceId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '123456',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['get'],
			},
		},
		description: 'Numeric ID returned by the Device List operation',
	},
	{
		displayName:
			'Device operations read account metadata only. They do not push content or refresh hardware.',
		name: 'deviceReadOnlyNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['device'],
			},
		},
	},
];
