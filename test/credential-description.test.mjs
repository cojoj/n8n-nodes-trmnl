import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TrmnlAccountApi } from '../dist/credentials/TrmnlAccountApi.credentials.js';
import { TrmnlPrivatePluginApi } from '../dist/credentials/TrmnlPrivatePluginApi.credentials.js';

const officialTrmnlIcons = {
	light: 'file:../nodes/Trmnl/trmnl.svg',
	dark: 'file:../nodes/Trmnl/trmnl.dark.svg',
};

describe('TRMNL credential descriptions', () => {
	it('uses themed official glyphs for Private Plugin credentials', () => {
		assert.deepEqual(new TrmnlPrivatePluginApi().icon, officialTrmnlIcons);
	});

	it('uses themed official glyphs for Account API credentials', () => {
		assert.deepEqual(new TrmnlAccountApi().icon, officialTrmnlIcons);
	});
});
