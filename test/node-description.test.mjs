import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Trmnl } from '../dist/nodes/Trmnl/Trmnl.node.js';

describe('TRMNL node description', () => {
	it('provides icons and a human-facing resource subtitle', () => {
		const { icon, subtitle, version } = new Trmnl().description;

		assert.deepEqual(icon, {
			light: 'file:trmnl.svg',
			dark: 'file:trmnl.dark.svg',
		});
		for (const label of ['Device', 'Markup', 'Playlist Item', 'Plugin Setting', 'Private Plugin']) {
			assert.match(subtitle, new RegExp(`\\b${label}\\b`));
		}
		assert.doesNotMatch(subtitle, /operation.*resource|resource.*operation/);
		assert.deepEqual(version, [1, 1.1]);
	});

	it('requires Account API credentials for Device, Playlist Item, and Plugin Setting operations', () => {
		const { credentials, properties } = new Trmnl().description;
		const accountCredential = credentials?.find(
			(credential) => credential.name === 'trmnlAccountApi',
		);

		assert.ok(accountCredential);
		assert.equal(accountCredential.required, true);
		assert.deepEqual(accountCredential.displayOptions, {
			show: {
				resource: ['device', 'playlistItem', 'pluginSetting'],
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
			['get', 'list', 'updateSleepMode'],
		);

		assert.ok(resource.options.some((option) => option.value === 'playlistItem'));
		const playlistItemOperation = properties.find(
			(property) =>
				property.name === 'operation' &&
				property.displayOptions?.show?.resource?.includes('playlistItem'),
		);
		assert.ok(
			playlistItemOperation && 'options' in playlistItemOperation && playlistItemOperation.options,
		);
		assert.deepEqual(
			playlistItemOperation.options.map((option) => option.value),
			['list', 'setVisibility'],
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

	it('uses expression-friendly Playlist Item visibility controls with clear side-effect scope', () => {
		const { properties } = new Trmnl().description;
		const playlistItemId = properties.find((property) => property.name === 'playlistItemId');
		const visible = properties.find((property) => property.name === 'visible');
		const notice = properties.find((property) => property.name === 'playlistItemVisibilityNotice');

		assert.ok(playlistItemId);
		assert.equal(playlistItemId.type, 'string');
		assert.equal(playlistItemId.required, true);
		assert.equal(playlistItemId.noDataExpression, undefined);
		assert.deepEqual(playlistItemId.displayOptions?.show?.operation, ['setVisibility']);
		assert.ok(visible);
		assert.equal(visible.type, 'boolean');
		assert.equal(visible.required, true);
		assert.equal(visible.default, true);
		assert.ok(notice);
		assert.match(notice.displayName, /future screen selection/);
		assert.match(notice.displayName, /does not push content/);
	});

	it('exposes only validated minute-of-day Device sleep controls', () => {
		const { properties } = new Trmnl().description;
		const deviceId = properties.find((property) => property.name === 'deviceId');
		const enabled = properties.find((property) => property.name === 'sleepModeEnabled');
		const start = properties.find((property) => property.name === 'sleepStartTime');
		const end = properties.find((property) => property.name === 'sleepEndTime');
		const notice = properties.find((property) => property.name === 'deviceSleepWriteNotice');

		assert.ok(deviceId);
		assert.deepEqual(deviceId.displayOptions?.show?.operation, ['get', 'updateSleepMode']);
		assert.ok(enabled);
		assert.equal(enabled.type, 'boolean');
		assert.equal(enabled.default, false);
		for (const property of [start, end]) {
			assert.ok(property);
			assert.equal(property.type, 'number');
			assert.equal(property.typeOptions?.minValue, 0);
			assert.equal(property.typeOptions?.maxValue, 1439);
			assert.deepEqual(property.displayOptions?.show?.sleepModeEnabled, [true]);
		}
		assert.equal(
			properties.some((property) => property.name === 'percentCharged'),
			false,
		);
		assert.equal(
			properties.some((property) => property.name === 'percent_charged'),
			false,
		);
		assert.ok(notice);
		assert.match(notice.displayName, /does not push content/);
		assert.match(notice.displayName, /Force Refresh/);
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

		const updateOperation = new Trmnl().description.properties
			.find(
				(property) =>
					property.name === 'operation' &&
					property.displayOptions?.show?.resource?.includes('pluginSetting'),
			)
			?.options?.find((option) => option.value === 'updateData');
		assert.match(updateOperation?.description ?? '', /compatible Plugin Setting/);
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
		assert.match(dataNotice.displayName, /only for Plugin Settings that support it/);
		assert.match(dataNotice.displayName, /Webhook Private Plugin/);
		assert.match(dataNotice.displayName, /Private Plugin → Set\/Get Content/);
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
			['payloadLimit'],
		);
		const payloadLimit = options.options[0];
		assert.equal(payloadLimit.type, 'options');
		assert.equal(payloadLimit.default, 2048);
		assert.deepEqual(
			payloadLimit.options.map((option) => ({ name: option.name, value: option.value })),
			[
				{ name: 'Regular (2 KB)', value: 2048 },
				{ name: 'TRMNL+ (5 KB)', value: 5120 },
			],
		);
		assert.match(payloadLimit.description, /Validation happens locally/);
		assert.match(payloadLimit.description, /does not change the server-side limit/);
	});

	it('offers native fields and JSON merge variable modes', () => {
		const { properties, version } = new Trmnl().description;
		const modes = properties.filter((property) => property.name === 'mergeVariablesMode');
		assert.deepEqual(version, [1, 1.1]);
		assert.equal(modes.length, 2);
		assert.deepEqual(
			modes.map((mode) => ({
				default: mode.default,
				version: mode.displayOptions?.show?.['@version'],
			})),
			[
				{ default: 'json', version: [1] },
				{ default: 'fields', version: [1.1] },
			],
		);
		for (const mode of modes) {
			assert.ok('options' in mode && mode.options);
			assert.deepEqual(
				mode.options.map((option) => option.value),
				['fields', 'json'],
			);
		}

		const assignments = properties.find((property) => property.name === 'mergeVariableAssignments');
		assert.ok(assignments);
		assert.equal(assignments.type, 'assignmentCollection');
		assert.deepEqual(assignments.displayOptions?.show?.mergeVariablesMode, ['fields']);

		const json = properties.find((property) => property.name === 'mergeVariables');
		assert.ok(json);
		assert.deepEqual(json.displayOptions?.hide?.mergeVariablesMode, ['fields']);
		assert.equal(json.default, '');
		assert.equal(json.placeholder, undefined);
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
