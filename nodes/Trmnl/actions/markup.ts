import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { assignmentsToJsonObject, parseJsonObject } from '../helpers/payload';
import { trmnlPublicApiRequest } from '../transport';
import { normalizeResponse, unwrapValidationResult } from '../utils';

export async function renderMarkup(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const markup = this.getNodeParameter('markup', itemIndex) as string;
	const nodeParameters = this.getNode().parameters;
	const variablesMode = Object.prototype.hasOwnProperty.call(nodeParameters, 'variablesMode')
		? (this.getNodeParameter('variablesMode', itemIndex) as string)
		: 'json';
	const variables = unwrapValidationResult(
		variablesMode === 'fields'
			? assignmentsToJsonObject(
					this.getNodeParameter('variableAssignments', itemIndex, { assignments: [] }),
					'Variables',
				)
			: parseJsonObject(this.getNodeParameter('variables', itemIndex), 'Variables'),
		this,
		itemIndex,
	);
	const response = await trmnlPublicApiRequest.call(
		this,
		{
			method: 'POST',
			url: 'https://trmnl.com/api/markup',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				markup,
				variables,
			},
			json: true,
		} as IHttpRequestOptions,
		{
			itemIndex,
			operation: 'render',
			operationLabel: 'rendering Liquid markup',
			resource: 'markup',
			target: 'Markup Render endpoint',
		},
	);
	const normalizedResponse = normalizeResponse(response);

	return {
		operation: 'render',
		success: true,
		variables,
		...(Object.prototype.hasOwnProperty.call(normalizedResponse, 'data')
			? { rendered: normalizedResponse.data }
			: {}),
		response: normalizedResponse,
	};
}
