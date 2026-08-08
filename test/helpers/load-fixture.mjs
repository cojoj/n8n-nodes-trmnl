import { readFileSync } from 'node:fs';

const fixturesDirectory = new URL('../fixtures/', import.meta.url);

export function loadFixture(filename) {
	return JSON.parse(readFileSync(new URL(filename, fixturesDirectory), 'utf8'));
}
