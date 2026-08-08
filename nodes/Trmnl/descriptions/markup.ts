import type { INodeProperties } from 'n8n-workflow';

export const markupOperation: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['markup'],
		},
	},
	options: [
		{
			name: 'Render',
			value: 'render',
			description: 'Render a Liquid markup template with variables',
			action: 'Render markup',
		},
	],
	default: 'render',
};

export const markupFields: INodeProperties[] = [
	{
		displayName: 'Liquid Markup',
		name: 'markup',
		type: 'string',
		noDataExpression: true,
		typeOptions: {
			rows: 8,
		},
		required: true,
		default: 'Hello, {{ name }}!',
		displayOptions: {
			show: {
				resource: ['markup'],
				operation: ['render'],
			},
		},
		description: 'Liquid markup sent to TRMNL unchanged. Use Variables below for dynamic n8n data.',
	},
	{
		displayName: 'Specify Variables',
		name: 'variablesMode',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Using Fields Below',
				value: 'fields',
				description: 'Add Liquid variables one by one',
			},
			{
				name: 'Using JSON',
				value: 'json',
				description: 'Provide all Liquid variables as one JSON object',
			},
		],
		default: 'json',
		displayOptions: {
			show: {
				resource: ['markup'],
				operation: ['render'],
			},
		},
		description: 'How to define the variables available to the Liquid markup',
	},
	{
		displayName: 'Variables',
		name: 'variableAssignments',
		type: 'assignmentCollection',
		default: { assignments: [] },
		typeOptions: {
			assignment: {
				defaultType: 'string',
			},
		},
		displayOptions: {
			show: {
				resource: ['markup'],
				operation: ['render'],
				variablesMode: ['fields'],
			},
		},
		description:
			'Each name becomes a variable available to the Liquid markup. Values support n8n expressions.',
	},
	{
		displayName: 'JSON',
		name: 'variables',
		type: 'json',
		required: true,
		default: '{\n  "name": "World"\n}',
		typeOptions: {
			rows: 6,
		},
		displayOptions: {
			show: {
				resource: ['markup'],
				operation: ['render'],
			},
			hide: {
				variablesMode: ['fields'],
			},
		},
		description:
			'Object available to the Liquid markup while TRMNL renders it. n8n expressions are supported here.',
	},
];
