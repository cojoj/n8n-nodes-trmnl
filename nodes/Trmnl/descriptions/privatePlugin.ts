import type { INodeProperties } from 'n8n-workflow';

import {
	DEFAULT_PAYLOAD_LIMIT_BYTES,
	DEFAULT_STREAM_LIMIT,
	TRMNL_PLUS_PAYLOAD_LIMIT_BYTES,
} from '../helpers/payload';

export const privatePluginOperation: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['privatePlugin'],
		},
	},
	options: [
		{
			name: 'Get Content',
			value: 'getContent',
			description: 'Get the current merge variables for a private plugin',
			action: 'Get private plugin content',
		},
		{
			name: 'Set Content',
			value: 'setContent',
			description:
				'Send merge variables to a private plugin for display on the next device refresh',
			action: 'Set private plugin content',
		},
	],
	default: 'setContent',
};

export const privatePluginFields: INodeProperties[] = [
	{
		displayName: 'Specify Merge Variables',
		name: 'mergeVariablesMode',
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
				resource: ['privatePlugin'],
				operation: ['setContent'],
			},
		},
		description: 'How to define the merge variables sent to TRMNL',
	},
	{
		displayName: 'Merge Variables',
		name: 'mergeVariableAssignments',
		type: 'assignmentCollection',
		default: { assignments: [] },
		typeOptions: {
			assignment: {
				defaultType: 'string',
			},
		},
		displayOptions: {
			show: {
				resource: ['privatePlugin'],
				operation: ['setContent'],
				mergeVariablesMode: ['fields'],
			},
		},
		description:
			'Data to store for the Private Plugin. Each name becomes a top-level Liquid variable.',
	},
	{
		displayName: 'JSON',
		name: 'mergeVariables',
		type: 'json',
		required: true,
		default:
			'{\n  "title": "Hello from n8n",\n  "message": "TRMNL webhook test works from local n8n.",\n  "items": [\n    {\n      "label": "Status",\n      "value": "Connected"\n    }\n  ]\n}',
		typeOptions: {
			rows: 10,
		},
		displayOptions: {
			show: {
				resource: ['privatePlugin'],
				operation: ['setContent'],
			},
			hide: {
				mergeVariablesMode: ['fields'],
			},
		},
		description:
			'Data to store for the Private Plugin. Each top-level key becomes a Liquid variable in the TRMNL markup editor.',
	},
	{
		displayName: "TRMNL displays the new content on the device's next scheduled or manual refresh.",
		name: 'refreshBehaviorNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['privatePlugin'],
				operation: ['setContent'],
			},
		},
	},
	{
		displayName: 'Merge Strategy',
		name: 'mergeStrategy',
		type: 'options',
		options: [
			{
				name: 'Deep Merge',
				value: 'deep_merge',
				description: 'Update nested values while preserving other stored values',
			},
			{
				name: 'Replace',
				value: 'replace',
				description: 'Replace all stored merge variables with this payload',
			},
			{
				name: 'Stream',
				value: 'stream',
				description:
					'Append values to top-level arrays and trim older entries; include every top-level key to retain',
			},
		],
		default: 'replace',
		displayOptions: {
			show: {
				resource: ['privatePlugin'],
				operation: ['setContent'],
			},
		},
		description: 'How to combine this payload with the merge variables already stored by TRMNL',
	},
	{
		displayName: 'Stream Limit',
		name: 'streamLimit',
		type: 'number',
		default: DEFAULT_STREAM_LIMIT,
		displayOptions: {
			show: {
				resource: ['privatePlugin'],
				operation: ['setContent'],
				mergeStrategy: ['stream'],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		description:
			'Maximum number of values retained in each top-level array included in the Stream payload',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['privatePlugin'],
				operation: ['setContent'],
			},
		},
		options: [
			{
				displayName: 'Payload Limit Bytes',
				name: 'payloadLimitBytes',
				type: 'number',
				default: DEFAULT_PAYLOAD_LIMIT_BYTES,
				typeOptions: {
					minValue: 1,
				},
				description: `Maximum request body size before this node fails locally. TRMNL regular limit is ${DEFAULT_PAYLOAD_LIMIT_BYTES} bytes; TRMNL+ is ${TRMNL_PLUS_PAYLOAD_LIMIT_BYTES} bytes.`,
			},
		],
	},
];
