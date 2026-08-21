import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	IExecuteFunctions,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const TRMNL_ACCOUNT_API_BASE_URL = 'https://trmnl.com';
const NETWORK_ERROR_CODES = new Set([
	'ECONNABORTED',
	'ECONNREFUSED',
	'ECONNRESET',
	'ENETUNREACH',
	'ENOTFOUND',
	'ETIMEDOUT',
]);

type CredentialBoundary = 'accountApi' | 'privatePlugin' | 'public';

export type TrmnlApiRequestContext = {
	credentialBoundary: CredentialBoundary;
	itemIndex: number;
	operation: string;
	operationLabel: string;
	resource: string;
	target: string;
	write?: boolean;
};

export type TrmnlApiErrorContext = Pick<
	TrmnlApiRequestContext,
	'operation' | 'operationLabel' | 'resource'
> & {
	networkErrorCode?: string;
	retryAfter?: string;
	statusCode?: number;
};

type ErrorRecord = Record<string, unknown>;

function asRecord(value: unknown): ErrorRecord | undefined {
	return value && typeof value === 'object' ? (value as ErrorRecord) : undefined;
}

function getStatusCode(error: unknown): number | undefined {
	const errorObject = asRecord(error);
	const response = asRecord(errorObject?.response);
	const candidate =
		errorObject?.statusCode ??
		errorObject?.httpCode ??
		errorObject?.status ??
		response?.statusCode ??
		response?.status;
	const statusCode = Number(candidate);

	return Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
		? statusCode
		: undefined;
}

function getHeaderValue(headers: unknown, headerName: string): unknown {
	if (!headers || typeof headers !== 'object') {
		return undefined;
	}

	if ('get' in headers && typeof headers.get === 'function') {
		return headers.get(headerName);
	}

	const matchingHeader = Object.entries(headers as ErrorRecord).find(
		([name]) => name.toLowerCase() === headerName.toLowerCase(),
	);

	return matchingHeader?.[1];
}

function getRetryAfter(error: unknown): string | undefined {
	const errorObject = asRecord(error);
	const response = asRecord(errorObject?.response);
	const value =
		getHeaderValue(response?.headers, 'retry-after') ??
		getHeaderValue(errorObject?.headers, 'retry-after');
	const retryAfter = Array.isArray(value) ? value[0] : value;

	if (typeof retryAfter !== 'string' && typeof retryAfter !== 'number') {
		return undefined;
	}

	const normalized = String(retryAfter).trim();

	return normalized && normalized.length <= 100 && !/[\r\n]/.test(normalized)
		? normalized
		: undefined;
}

function getNetworkErrorCode(error: unknown): string | undefined {
	const code = asRecord(error)?.code;

	return typeof code === 'string' && NETWORK_ERROR_CODES.has(code) ? code : undefined;
}

function describeRetryAfter(retryAfter: string): string {
	return /^\d+$/.test(retryAfter)
		? ` Retry after ${retryAfter} seconds, as directed by the Retry-After header.`
		: ` Retry at or after ${retryAfter}, as directed by the Retry-After header.`;
}

function getUnprocessableEntityMessage(context: TrmnlApiRequestContext): string {
	if (context.resource === 'pluginSetting' && context.operation === 'getData') {
		return 'TRMNL has no data available for this Plugin Setting. Its source may not have refreshed yet.';
	}

	if (context.resource === 'pluginSetting' && context.operation === 'updateData') {
		return 'TRMNL cannot modify data for this Plugin Setting. The setting may not support Account API data updates.';
	}

	if (context.resource === 'playlistItem' && context.operation === 'setVisibility') {
		return 'TRMNL rejected this Playlist Item visibility change. The item may no longer support visibility updates.';
	}

	if (context.resource === 'device' && context.operation === 'updateSleepMode') {
		return 'TRMNL rejected this Device sleep schedule. Check the enabled state and minute-of-day values.';
	}

	if (
		context.resource === 'pluginSetting' &&
		(context.operation === 'readMarkup' || context.operation === 'writeMarkup')
	) {
		return 'TRMNL could not process this markup operation. Confirm that the size is returned by Get Details and the Plugin Setting is editable by this account.';
	}

	if (context.resource === 'markup') {
		return 'TRMNL could not render the supplied Liquid markup and variables. Check the markup syntax and payload.';
	}

	if (context.resource === 'privatePlugin') {
		return 'TRMNL rejected the Private Plugin content payload. Check the merge variables and selected merge strategy.';
	}

	return `TRMNL could not process the request while ${context.operationLabel}.`;
}

function getApiErrorMessage(
	context: TrmnlApiRequestContext,
	statusCode: number | undefined,
	retryAfter: string | undefined,
): string {
	if (statusCode === 401) {
		if (context.credentialBoundary === 'accountApi') {
			return `TRMNL Account API authentication failed while ${context.operationLabel}. Check the TRMNL Account API credential and developer access.`;
		}

		if (context.credentialBoundary === 'privatePlugin') {
			return `TRMNL Private Plugin access failed while ${context.operationLabel}. Check the saved Webhook URL or Plugin Setting UUID in the TRMNL Private Plugin API credential.`;
		}

		return `TRMNL rejected the unauthenticated request while ${context.operationLabel}.`;
	}

	if (statusCode === 404) {
		return `TRMNL could not find the requested ${context.target} while ${context.operationLabel}. Check the target without exposing its identifier.`;
	}

	if (statusCode === 422) {
		return getUnprocessableEntityMessage(context);
	}

	if (statusCode === 429) {
		const retryGuidance = context.write
			? ' Review the write for safe repeat behavior before enabling n8n Retry On Fail.'
			: ' Use n8n Retry On Fail deliberately if repeating this read is appropriate.';

		return `TRMNL rate limit reached while ${context.operationLabel}.${
			retryAfter ? describeRetryAfter(retryAfter) : ''
		} No automatic retry was attempted.${retryGuidance}`;
	}

	if (statusCode !== undefined && statusCode >= 500) {
		return `TRMNL service failed while ${context.operationLabel} (HTTP ${statusCode}). No automatic retry was attempted; try again later or configure n8n Retry On Fail deliberately.`;
	}

	if (statusCode !== undefined) {
		return `TRMNL API request failed while ${context.operationLabel} (HTTP ${statusCode}). Check the operation inputs and try again.`;
	}

	return `TRMNL network request failed while ${context.operationLabel}. No response was received; check connectivity before trying again.`;
}

function createTrmnlApiError(
	executeFunctions: IExecuteFunctions,
	error: unknown,
	context: TrmnlApiRequestContext,
): NodeApiError {
	const statusCode = getStatusCode(error);
	const retryAfter = statusCode === 429 ? getRetryAfter(error) : undefined;
	const networkErrorCode = statusCode === undefined ? getNetworkErrorCode(error) : undefined;
	const message = getApiErrorMessage(context, statusCode, retryAfter);
	const errorResponse: JsonObject = {
		message,
		...(statusCode === undefined ? {} : { statusCode }),
	};
	const apiError = new NodeApiError(executeFunctions.getNode(), errorResponse, {
		httpCode: statusCode === undefined ? undefined : String(statusCode),
		itemIndex: context.itemIndex,
		message,
	});
	const safeContext: TrmnlApiErrorContext = {
		operation: context.operation,
		operationLabel: context.operationLabel,
		resource: context.resource,
		...(statusCode === undefined ? {} : { statusCode }),
		...(networkErrorCode === undefined ? {} : { networkErrorCode }),
		...(retryAfter === undefined ? {} : { retryAfter }),
	};

	return Object.assign(apiError, {
		trmnlContext: safeContext,
		trmnlSanitized: true,
	});
}

async function requestWithErrorHandling(
	executeFunctions: IExecuteFunctions,
	request: () => Promise<unknown>,
	context: TrmnlApiRequestContext,
): Promise<unknown> {
	try {
		return await request();
	} catch (error) {
		if (error instanceof NodeOperationError) {
			throw new NodeOperationError(executeFunctions.getNode(), error, {
				itemIndex: context.itemIndex,
			});
		}

		throw createTrmnlApiError(executeFunctions, error, context);
	}
}

export function getTrmnlApiErrorContext(error: unknown): TrmnlApiErrorContext | undefined {
	if (!(error instanceof NodeApiError)) {
		return undefined;
	}

	return (error as NodeApiError & { trmnlContext?: TrmnlApiErrorContext }).trmnlContext;
}

export async function trmnlAccountApiRequest(
	this: IExecuteFunctions,
	options: IHttpRequestOptions,
	context: Omit<TrmnlApiRequestContext, 'credentialBoundary'>,
): Promise<unknown> {
	return await requestWithErrorHandling(
		this,
		async () =>
			await this.helpers.httpRequestWithAuthentication.call(this, 'trmnlAccountApi', {
				...options,
				url: `${TRMNL_ACCOUNT_API_BASE_URL}${options.url}`,
				json: options.json ?? true,
			} as IHttpRequestOptions),
		{ ...context, credentialBoundary: 'accountApi' },
	);
}

export async function trmnlPrivatePluginApiRequest(
	this: IExecuteFunctions,
	options: IHttpRequestOptions,
	context: Omit<TrmnlApiRequestContext, 'credentialBoundary'>,
	credentials: ICredentialDataDecryptedObject,
): Promise<unknown> {
	// The modern HTTP helper has no item-index argument. Supplying the credential
	// already resolved by the action prevents item expressions from falling back
	// to the first input item's Private Plugin endpoint during authentication.
	const credentialsDecrypted: ICredentialsDecrypted = {
		id: 'resolved-per-item',
		name: 'Resolved TRMNL Private Plugin credential',
		type: 'trmnlPrivatePluginApi',
		data: credentials,
	};

	return await requestWithErrorHandling(
		this,
		async () =>
			await this.helpers.httpRequestWithAuthentication.call(
				this,
				'trmnlPrivatePluginApi',
				options,
				{ credentialsDecrypted },
			),
		{ ...context, credentialBoundary: 'privatePlugin' },
	);
}

export async function trmnlPublicApiRequest(
	this: IExecuteFunctions,
	options: IHttpRequestOptions,
	context: Omit<TrmnlApiRequestContext, 'credentialBoundary'>,
): Promise<unknown> {
	return await requestWithErrorHandling(this, async () => await this.helpers.httpRequest(options), {
		...context,
		credentialBoundary: 'public',
	});
}
