import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

const TRMNL_ACCOUNT_API_BASE_URL = 'https://trmnl.com';

export async function trmnlAccountApiRequest(
	this: IExecuteFunctions,
	options: IHttpRequestOptions,
): Promise<unknown> {
	return await this.helpers.httpRequestWithAuthentication.call(this, 'trmnlAccountApi', {
		...options,
		url: `${TRMNL_ACCOUNT_API_BASE_URL}${options.url}`,
		json: true,
	} as IHttpRequestOptions);
}
