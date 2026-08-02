import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Trmnl } from '../dist/nodes/Trmnl/Trmnl.node.js';

describe('TRMNL node description', () => {
	it('provides light and dark icons', () => {
		const { icon } = new Trmnl().description;

		assert.deepEqual(icon, {
			light: 'file:trmnl.svg',
			dark: 'file:trmnl.dark.svg',
		});
	});

	it('shows Stream Limit only for the stream merge strategy', () => {
		const { properties } = new Trmnl().description;
		const mergeStrategy = properties.find((property) => property.name === 'mergeStrategy');
		assert.ok(mergeStrategy && 'options' in mergeStrategy && mergeStrategy.options);
		const streamStrategy = mergeStrategy.options.find((option) => option.value === 'stream');
		assert.ok(streamStrategy);
		assert.match(streamStrategy.description ?? '', /include every top-level key to retain/);

		const streamLimit = properties.find((property) => property.name === 'streamLimit');
		assert.ok(streamLimit);
		assert.deepEqual(streamLimit.displayOptions, {
			show: {
				resource: ['privatePlugin'],
				operation: ['setContent'],
				mergeStrategy: ['stream'],
			},
		});

		const options = properties.find((property) => property.name === 'options');
		assert.ok(options && 'options' in options && options.options);
		assert.deepEqual(
			options.options.map((option) => option.name),
			['payloadLimitBytes'],
		);
	});

	it('offers native fields and JSON merge variable modes', () => {
		const { properties } = new Trmnl().description;
		const mode = properties.find((property) => property.name === 'mergeVariablesMode');
		assert.ok(mode && 'options' in mode && mode.options);
		assert.equal(mode.default, 'json');
		assert.deepEqual(
			mode.options.map((option) => option.value),
			['fields', 'json'],
		);

		const assignments = properties.find(
			(property) => property.name === 'mergeVariableAssignments',
		);
		assert.ok(assignments);
		assert.equal(assignments.type, 'assignmentCollection');
		assert.deepEqual(assignments.displayOptions?.show?.mergeVariablesMode, ['fields']);

		const json = properties.find((property) => property.name === 'mergeVariables');
		assert.ok(json);
		assert.deepEqual(json.displayOptions?.hide?.mergeVariablesMode, ['fields']);
	});

	it('keeps Liquid markup separate from n8n expressions', () => {
		const { properties } = new Trmnl().description;
		const markup = properties.find((property) => property.name === 'markup');
		assert.ok(markup);
		assert.equal(markup.displayName, 'Liquid Markup');
		assert.equal(markup.noDataExpression, true);
		assert.match(markup.description ?? '', /sent to TRMNL unchanged/);

		const variablesMode = properties.find((property) => property.name === 'variablesMode');
		assert.ok(variablesMode && 'options' in variablesMode && variablesMode.options);
		assert.equal(variablesMode.default, 'json');
		assert.deepEqual(
			variablesMode.options.map((option) => option.value),
			['fields', 'json'],
		);

		const assignments = properties.find((property) => property.name === 'variableAssignments');
		assert.ok(assignments);
		assert.equal(assignments.type, 'assignmentCollection');
		assert.deepEqual(assignments.displayOptions?.show?.variablesMode, ['fields']);

		const variables = properties.find((property) => property.name === 'variables');
		assert.ok(variables);
		assert.deepEqual(variables.displayOptions?.hide?.variablesMode, ['fields']);
		assert.match(variables.description ?? '', /n8n expressions are supported here/);
	});
});
