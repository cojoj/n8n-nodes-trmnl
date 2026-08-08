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

function cleanAccountApiError(error: unknown, options: IHttpRequestOptions): unknown {
	const statusCode = getStatusCode(error);
	const method = options.method ?? 'GET';
	const { url } = options;
	let message: string | undefined;

	if (statusCode === 401) {
		message =
			'TRMNL Account API authentication failed. Check the Account API key and developer access.';
	} else if (statusCode === 404) {
		message = 'TRMNL could not find the requested account resource.';
	} else if (statusCode === 422 && /\/api\/plugin_settings\/[^/]+\/data$/.test(url)) {
		message =
			method === 'POST'
				? 'TRMNL cannot modify data for this Plugin Setting. The setting may not support Account API data updates.'
				: 'TRMNL has no data available for this Plugin Setting. Its source may not have refreshed yet.';
	} else if (statusCode === 422 && /\/api\/plugin_settings\/[^/]+\/markup\/[^/]+$/.test(url)) {
		message =
			'TRMNL rejected this markup size. Use a size returned by Get Details or another size supported by the Plugin Setting.';
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
			json: options.json ?? true,
		} as IHttpRequestOptions);
	} catch (error) {
		throw cleanAccountApiError(error, options);
	}
}
