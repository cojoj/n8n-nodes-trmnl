import type { AssignmentCollectionValue, FieldType, IDataObject } from 'n8n-workflow';
import { validateFieldType } from 'n8n-workflow';

const CUSTOM_PLUGIN_PATH = '/api/custom_plugins/';
const DEFAULT_TRMNL_BASE_URL = 'https://trmnl.com';
const PLUGIN_SETTING_UUID_PATTERN = /^[A-Za-z0-9_-]+$/;
const PRIVATE_PLUGIN_PATH_PATTERN = /^\/api\/custom_plugins\/([A-Za-z0-9_-]+)\/?$/;

export const DEFAULT_PAYLOAD_LIMIT_BYTES = 2048;
export const TRMNL_PLUS_PAYLOAD_LIMIT_BYTES = 5120;
export const DEFAULT_STREAM_LIMIT = 10;

const MERGE_STRATEGIES = ['replace', 'deep_merge', 'stream'] as const;

type MergeStrategy = (typeof MERGE_STRATEGIES)[number];
type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function normalizePrivatePluginEndpoint(webhookUrlOrUuid: string): ValidationResult<string> {
	const value = webhookUrlOrUuid.trim();

	if (!value) {
		return { ok: false, error: 'Enter a TRMNL Private Plugin webhook URL or UUID.' };
	}

	if (PLUGIN_SETTING_UUID_PATTERN.test(value)) {
		return { ok: true, value: `${DEFAULT_TRMNL_BASE_URL}${CUSTOM_PLUGIN_PATH}${value}` };
	}

	if (!value.includes('://')) {
		return {
			ok: false,
			error: 'Plugin Setting UUID may only contain letters, numbers, underscores, or hyphens.',
		};
	}

	let url: URL;

	try {
		url = new URL(value);
	} catch {
		return { ok: false, error: 'Webhook URL is invalid.' };
	}

	if (url.protocol !== 'https:') {
		return { ok: false, error: 'Webhook URL must use HTTPS.' };
	}

	const schemeSeparatorIndex = value.indexOf('://');
	const authorityStartIndex = schemeSeparatorIndex + 3;
	const authoritySuffix = value.slice(authorityStartIndex);
	const authorityEndOffset = authoritySuffix.search(/[/?#]/);
	const authorityEndIndex =
		authorityEndOffset === -1 ? value.length : authorityStartIndex + authorityEndOffset;
	const rawAuthority = value.slice(authorityStartIndex, authorityEndIndex);

	if (url.username || url.password || rawAuthority.includes('@')) {
		return { ok: false, error: 'Webhook URL must not include credentials.' };
	}

	if (url.hostname !== 'trmnl.com') {
		return {
			ok: false,
			error: 'Webhook URL must use the documented TRMNL origin: https://trmnl.com.',
		};
	}

	if (url.port || /:\d*$/.test(rawAuthority)) {
		return { ok: false, error: 'Webhook URL must not include a port.' };
	}

	if (url.href.includes('?') || url.href.includes('#')) {
		return { ok: false, error: 'Webhook URL must not include a query string or fragment.' };
	}

	if (value.includes('\\') || hasAsciiControlCharacters(value)) {
		return { ok: false, error: 'Webhook URL contains unsupported characters.' };
	}

	const rawPath = value.slice(authorityEndIndex);
	const pathMatch = PRIVATE_PLUGIN_PATH_PATTERN.exec(rawPath);

	if (!pathMatch) {
		return {
			ok: false,
			error: 'Webhook URL must match https://trmnl.com/api/custom_plugins/{plugin-setting-uuid}.',
		};
	}

	return { ok: true, value: `${DEFAULT_TRMNL_BASE_URL}${CUSTOM_PLUGIN_PATH}${pathMatch[1]}` };
}

function hasAsciiControlCharacters(value: string): boolean {
	for (const character of value) {
		const characterCode = character.charCodeAt(0);

		if (characterCode <= 0x1f || characterCode === 0x7f) {
			return true;
		}
	}

	return false;
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

export function assignmentsToJsonObject(
	value: unknown,
	fieldName = 'Merge Variables',
): ValidationResult<IDataObject> {
	const assignments = (value as Partial<AssignmentCollectionValue> | null)?.assignments;

	if (!Array.isArray(assignments)) {
		return { ok: false, error: `${fieldName} fields are invalid.` };
	}

	const mergeVariables: IDataObject = {};

	for (const assignment of assignments) {
		const name = typeof assignment?.name === 'string' ? assignment.name.trim() : '';

		if (!name) {
			return { ok: false, error: `Each ${fieldName} field must have a name.` };
		}

		if (assignment.value === null || assignment.value === undefined) {
			mergeVariables[name] = null;
			continue;
		}

		const type = (assignment.type ?? 'string') as FieldType;
		let assignmentValue: unknown = assignment.value;

		if (type === 'string') {
			assignmentValue =
				typeof assignmentValue === 'object'
					? JSON.stringify(assignmentValue)
					: String(assignmentValue);
		}

		let validationResult;

		try {
			validationResult = validateFieldType(name, assignmentValue, type);
		} catch {
			return { ok: false, error: `${fieldName} field "${name}" has an unsupported type.` };
		}

		if (!validationResult.valid) {
			return { ok: false, error: validationResult.errorMessage };
		}

		mergeVariables[name] = (validationResult.newValue ?? null) as IDataObject[string];
	}

	return { ok: true, value: mergeVariables };
}

export function getJsonSizeBytes(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

export function buildPrivatePluginPayload(
	mergeVariables: IDataObject,
	options: IDataObject = {},
): ValidationResult<IDataObject> {
	const mergeStrategy = getMergeStrategy(options.mergeStrategy);

	if (!mergeStrategy.ok) {
		return mergeStrategy;
	}

	const body: IDataObject = {
		merge_variables: mergeVariables,
	};

	if (mergeStrategy.value !== 'replace') {
		body.merge_strategy = mergeStrategy.value;
	}

	if (mergeStrategy.value === 'stream') {
		const streamLimit = getPositiveInteger(options.streamLimit, 'Stream Limit');

		if (!streamLimit.ok) {
			return streamLimit;
		}

		body.stream_limit = streamLimit.value;
	}

	return { ok: true, value: body };
}

function parseJson(value: string, fieldName: string): ValidationResult<unknown> {
	try {
		return { ok: true, value: JSON.parse(value) as unknown };
	} catch {
		return { ok: false, error: `${fieldName} must contain valid JSON.` };
	}
}

function getMergeStrategy(value: unknown): ValidationResult<MergeStrategy> {
	const mergeStrategy = (value ?? 'replace') as string;

	if (MERGE_STRATEGIES.includes(mergeStrategy as MergeStrategy)) {
		return { ok: true, value: mergeStrategy as MergeStrategy };
	}

	return {
		ok: false,
		error: `Merge Strategy must be one of: ${MERGE_STRATEGIES.join(', ')}.`,
	};
}

function getPositiveInteger(value: unknown, fieldName: string): ValidationResult<number> {
	const parsedValue = Number(value ?? DEFAULT_STREAM_LIMIT);

	if (!Number.isInteger(parsedValue) || parsedValue < 1) {
		return { ok: false, error: `${fieldName} must be a positive integer.` };
	}

	return { ok: true, value: parsedValue };
}
