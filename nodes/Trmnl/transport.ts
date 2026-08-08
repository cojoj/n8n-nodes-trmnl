import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

const TRMNL_ACCOUNT_API_BASE_URL = 'https://trmnl.com';

function getStatusCode(error: unknown): number | undefined {
	if (!error || typeof error !== 'object') {
		return undefined;
	}

	const errorObject = error as {
		httpCode?: unknown;
		status?: unknown;
		statusCode?: unknown;
		response?: { status?: unknown; statusCode?: unknown };
	};
	const candidate =
		errorObject.statusCode ??
		errorObject.httpCode ??
		errorObject.status ??
		errorObject.response?.statusCode ??
		errorObject.response?.status;
	const statusCode = Number(candidate);

	return Number.isInteger(statusCode) ? statusCode : undefined;
}

function cleanAccountApiError(error: unknown, url: string): unknown {
	const statusCode = getStatusCode(error);
	let message: string | undefined;

	if (statusCode === 401) {
		message =
			'TRMNL Account API authentication failed. Check the Account API key and developer access.';
	} else if (statusCode === 404) {
		message = 'TRMNL could not find the requested account resource.';
	} else if (statusCode === 422 && /\/api\/plugin_settings\/[^/]+\/data$/.test(url)) {
		message =
			'TRMNL has no data available for this Plugin Setting. Its source may not have refreshed yet.';
	}

	if (!message || statusCode === undefined) {
		return error;
	}

	return Object.assign(new Error(message), {
		httpCode: String(statusCode),
		statusCode,
		trmnlSanitized: true,
	});
}

export async function trmnlAccountApiRequest(
	this: IExecuteFunctions,
	options: IHttpRequestOptions,
): Promise<unknown> {
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'trmnlAccountApi', {
			...options,
			url: `${TRMNL_ACCOUNT_API_BASE_URL}${options.url}`,
			json: true,
		} as IHttpRequestOptions);
	} catch (error) {
		throw cleanAccountApiError(error, options.url);
	}
}
