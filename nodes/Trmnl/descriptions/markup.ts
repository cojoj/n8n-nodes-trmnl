import type { INodeProperties } from 'n8n-workflow';

function variablesSourceProperty(
	versions: Array<1 | 1.1 | 1.2>,
	defaultValue: 'input' | 'json',
	includeInput: boolean,
): INodeProperties {
	return {
		displayName: 'Variables Source',
		name: 'variablesMode',
		type: 'options',
		noDataExpression: true,
		options: [
			...(includeInput
				? [
						{
							name: 'Input Data',
							value: 'input',
							description: "Use each incoming item's JSON object as Liquid variables",
						},
					]
				: []),
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
		default: defaultValue,
		displayOptions: {
			show: {
				resource: ['markup'],
				operation: ['render'],
				'@version': versions,
			},
		},
		description: 'Where the variables available to the Liquid markup come from',
	};
}

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
			description: "Render a Liquid template to HTML with TRMNL's public API",
			action: 'Render markup',
		},
	],
	default: 'render',
};

export const markupFields: INodeProperties[] = [
	{
		displayName:
			"Markup and variables are sent to TRMNL's public Render endpoint. This returns rendered HTML; it does not save markup, update a plugin, or refresh a device.",
		name: 'markupRenderNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['markup'],
				operation: ['render'],
			},
		},
	},
	{
		displayName: 'Markup Source',
		name: 'markupSource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Define Below',
				value: 'defineBelow',
				description: 'Write a literal Liquid template in this node',
			},
			{
				name: 'From Input Field',
				value: 'inputField',
				description: "Read each incoming item's Liquid template from a JSON field",
			},
		],
		default: 'defineBelow',
		displayOptions: {
			show: {
				resource: ['markup'],
				operation: ['render'],
				'@version': [1.2],
			},
		},
		description: 'Whether the Liquid template is defined here or supplied by input data',
	},
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
			hide: {
				markupSource: ['inputField'],
			},
		},
		description:
			'Liquid markup sent to TRMNL unchanged. Choose where its variables come from below.',
	},
	{
		displayName: 'Input Field',
		name: 'markupInputField',
		type: 'string',
		noDataExpression: true,
		required: true,
		default: 'markup',
		displayOptions: {
			show: {
				resource: ['markup'],
				operation: ['render'],
				markupSource: ['inputField'],
				'@version': [1.2],
			},
		},
		description:
			'Name of the top-level input JSON field containing a Liquid template string. The field is read separately for every input item.',
	},
	variablesSourceProperty([1, 1.1], 'json', false),
	variablesSourceProperty([1.2], 'input', true),
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
				variablesMode: ['fields', 'input'],
			},
		},
		description:
			'Object available to the Liquid markup while TRMNL renders it. n8n expressions are supported here.',
	},
];
