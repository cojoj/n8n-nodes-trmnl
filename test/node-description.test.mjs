import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Trmnl } from '../dist/nodes/Trmnl/Trmnl.node.js';

describe('TRMNL node description', () => {
	it('provides light and dark icons', () => {
		const { icon, version } = new Trmnl().description;

		assert.deepEqual(icon, {
			light: 'file:trmnl.svg',
			dark: 'file:trmnl.dark.svg',
		});
		assert.equal(version, 1);
	});

	it('requires Account API credentials for Device and Plugin Setting operations', () => {
		const { credentials, properties } = new Trmnl().description;
		const accountCredential = credentials?.find(
			(credential) => credential.name === 'trmnlAccountApi',
		);

		assert.ok(accountCredential);
		assert.equal(accountCredential.required, true);
		assert.deepEqual(accountCredential.displayOptions, {
			show: {
				resource: ['device', 'pluginSetting'],
			},
		});

		const resource = properties.find((property) => property.name === 'resource');
		assert.ok(resource && 'options' in resource && resource.options);
		assert.ok(resource.options.some((option) => option.value === 'device'));

		const operation = properties.find(
			(property) =>
				property.name === 'operation' &&
				property.displayOptions?.show?.resource?.includes('device'),
		);
		assert.ok(operation && 'options' in operation && operation.options);
		assert.deepEqual(
			operation.options.map((option) => option.value),
			['get', 'list'],
		);

		assert.ok(resource.options.some((option) => option.value === 'pluginSetting'));
		const pluginSettingOperation = properties.find(
			(property) =>
				property.name === 'operation' &&
				property.displayOptions?.show?.resource?.includes('pluginSetting'),
		);
		assert.ok(
			pluginSettingOperation &&
				'options' in pluginSettingOperation &&
				pluginSettingOperation.options,
		);
		assert.deepEqual(
			pluginSettingOperation.options.map((option) => option.value),
			['getData', 'getDetails', 'list', 'readMarkup', 'updateData', 'writeMarkup'],
		);
	});

	it('keeps Plugin Setting identifiers expression-friendly without a dynamic selector', () => {
		const { properties } = new Trmnl().description;
		const pluginId = properties.find((property) => property.name === 'pluginId');
		const pluginSettingUuid = properties.find((property) => property.name === 'pluginSettingUuid');
		const pluginSettingId = properties.find((property) => property.name === 'pluginSettingId');

		assert.ok(pluginId);
		assert.equal(pluginId.type, 'string');
		assert.equal(pluginId.required, undefined);
		assert.deepEqual(pluginId.displayOptions?.show?.operation, ['list']);
		assert.ok(pluginSettingUuid);
		assert.equal(pluginSettingUuid.type, 'string');
		assert.equal(pluginSettingUuid.required, true);
		assert.deepEqual(pluginSettingUuid.displayOptions?.show?.operation, [
			'getDetails',
			'readMarkup',
			'writeMarkup',
		]);
		assert.ok(pluginSettingId);
		assert.equal(pluginSettingId.type, 'string');
		assert.equal(pluginSettingId.required, true);
		assert.deepEqual(pluginSettingId.displayOptions?.show?.operation, ['getData', 'updateData']);
		assert.ok(properties.every((property) => property.type !== 'resourceLocator'));
	});

	it('keeps markup sizes open, expression-friendly, and safe by default', () => {
		const { properties } = new Trmnl().description;
		const markupSize = properties.find((property) => property.name === 'markupSize');

		assert.ok(markupSize);
		assert.equal(markupSize.type, 'string');
		assert.equal(markupSize.default, 'markup_full');
		assert.equal(markupSize.noDataExpression, undefined);
		assert.deepEqual(markupSize.displayOptions?.show?.operation, ['readMarkup', 'writeMarkup']);
		assert.match(markupSize.description ?? '', /returned by Get Details when available/);
	});

	it('offers native fields and JSON modes for Plugin Setting data updates', () => {
		const { properties } = new Trmnl().description;
		const mode = properties.find((property) => property.name === 'pluginSettingDataMode');
		const assignments = properties.find(
			(property) => property.name === 'pluginSettingDataAssignments',
		);
		const json = properties.find((property) => property.name === 'pluginSettingData');

		assert.ok(mode && 'options' in mode && mode.options);
		assert.equal(mode.default, 'json');
		assert.deepEqual(
			mode.options.map((option) => option.value),
			['fields', 'json'],
		);
		assert.deepEqual(mode.displayOptions?.show?.operation, ['updateData']);
		assert.ok(assignments);
		assert.equal(assignments.type, 'assignmentCollection');
		assert.deepEqual(assignments.displayOptions?.show?.pluginSettingDataMode, ['fields']);
		assert.ok(json);
		assert.equal(json.type, 'json');
		assert.deepEqual(json.displayOptions?.hide?.pluginSettingDataMode, ['fields']);
	});

	it('keeps saved Plugin Setting Liquid markup literal and explains write semantics', () => {
		const { properties } = new Trmnl().description;
		const markup = properties.find((property) => property.name === 'pluginSettingMarkup');
		const dataNotice = properties.find(
			(property) => property.name === 'pluginSettingDataWriteNotice',
		);
		const markupNotice = properties.find(
			(property) => property.name === 'pluginSettingMarkupWriteNotice',
		);

		assert.ok(markup);
		assert.equal(markup.displayName, 'Liquid Markup');
		assert.equal(markup.noDataExpression, true);
		assert.match(markup.description ?? '', /saved to TRMNL unchanged/);
		assert.ok(dataNotice);
		assert.match(dataNotice.displayName, /server-side Plugin Setting data/);
		assert.match(dataNotice.displayName, /does not Force Refresh/);
		assert.ok(markupNotice);
		assert.match(markupNotice.displayName, /future TRMNL renders/);
		assert.match(markupNotice.displayName, /does not Force Refresh/);
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

		const assignments = properties.find((property) => property.name === 'mergeVariableAssignments');
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
