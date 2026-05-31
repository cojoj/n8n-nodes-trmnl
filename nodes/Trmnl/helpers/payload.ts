import type { IDataObject } from 'n8n-workflow';

const CUSTOM_PLUGIN_PATH = '/api/custom_plugins/';
const DEFAULT_TRMNL_BASE_URL = 'https://trmnl.com';

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function normalizePrivatePluginEndpoint(
	webhookUrlOrUuid: string,
): ValidationResult<string> {
	const value = webhookUrlOrUuid.trim();

	if (!value) {
		return { ok: false, error: 'Enter a TRMNL Private Plugin webhook URL or UUID.' };
	}

	try {
		const url = new URL(value);

		if (!['http:', 'https:'].includes(url.protocol)) {
			return { ok: false, error: 'Webhook URL must use HTTP or HTTPS.' };
		}

		return { ok: true, value: url.toString().replace(/\/$/, '') };
	} catch (error) {
		if (value.includes('://')) {
			return {
				ok: false,
				error: error instanceof Error ? error.message : 'Webhook URL is invalid.',
			};
		}
	}

	if (!/^[A-Za-z0-9_-]+$/.test(value)) {
		return {
			ok: false,
			error: 'Plugin Setting UUID may only contain letters, numbers, underscores, or hyphens.',
		};
	}

	return { ok: true, value: `${DEFAULT_TRMNL_BASE_URL}${CUSTOM_PLUGIN_PATH}${value}` };
}

export function parseJsonObject(value: unknown, fieldName: string): ValidationResult<IDataObject> {
	let parsed = value;

	if (typeof value === 'string') {
		const parsedJson = parseJson(value, fieldName);

		if (!parsedJson.ok) {
			return parsedJson;
		}

		parsed = parsedJson.value;
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return { ok: false, error: `${fieldName} must be a JSON object.` };
	}

	return { ok: true, value: parsed as IDataObject };
}

export function getJsonSizeBytes(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function parseJson(value: string, fieldName: string): ValidationResult<unknown> {
	try {
		return { ok: true, value: JSON.parse(value) as unknown };
	} catch {
		return { ok: false, error: `${fieldName} must contain valid JSON.` };
	}
}
