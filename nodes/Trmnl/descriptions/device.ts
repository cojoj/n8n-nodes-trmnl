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
			{
				name: 'Update Sleep Mode',
				value: 'updateSleepMode',
				description: 'Update the sleep schedule for a device',
				action: 'Update device sleep mode',
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
				operation: ['get', 'updateSleepMode'],
			},
		},
		description: 'Numeric ID returned by the Device List operation',
	},
	{
		displayName: 'Sleep Mode Enabled',
		name: 'sleepModeEnabled',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['updateSleepMode'],
			},
		},
		description: 'Whether the device should use its configured sleep schedule',
	},
	{
		displayName: 'Sleep Start (Minute of Day)',
		name: 'sleepStartTime',
		type: 'number',
		required: true,
		default: 1320,
		typeOptions: {
			minValue: 0,
			maxValue: 1439,
		},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['updateSleepMode'],
				sleepModeEnabled: [true],
			},
		},
		description: 'Local minute of day when sleep starts, from 0 (00:00) to 1439 (23:59)',
	},
	{
		displayName: 'Sleep End (Minute of Day)',
		name: 'sleepEndTime',
		type: 'number',
		required: true,
		default: 480,
		typeOptions: {
			minValue: 0,
			maxValue: 1439,
		},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['updateSleepMode'],
				sleepModeEnabled: [true],
			},
		},
		description: 'Local minute of day when sleep ends, from 0 (00:00) to 1439 (23:59)',
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
				operation: ['get', 'list'],
			},
		},
	},
	{
		displayName:
			'Update Sleep Mode changes the device sleep schedule. It does not push content, Force Refresh, or prove a physical-device state change.',
		name: 'deviceSleepWriteNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['updateSleepMode'],
			},
		},
	},
];
