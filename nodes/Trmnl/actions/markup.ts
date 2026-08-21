import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { assignmentsToJsonObject, parseJsonObject } from '../helpers/payload';
import { trmnlPublicApiRequest } from '../transport';
import { normalizeResponse, unwrapValidationResult } from '../utils';

export async function renderMarkup(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const typeVersion = this.getNode().typeVersion;
	const markupSource =
		typeVersion >= 1.2
			? (this.getNodeParameter('markupSource', itemIndex, 'defineBelow') as string)
			: 'defineBelow';
	const markup = (() => {
		if (markupSource !== 'inputField') {
			return this.getNodeParameter('markup', itemIndex) as string;
		}

		const fieldName = String(this.getNodeParameter('markupInputField', itemIndex)).trim();
		const input = this.getInputData()[itemIndex].json;
		if (!fieldName || !Object.prototype.hasOwnProperty.call(input, fieldName)) {
			throw new NodeOperationError(this.getNode(), 'The selected Markup input field is missing.', {
				itemIndex,
			});
		}

		const value = input[fieldName];
		if (typeof value !== 'string') {
			throw new NodeOperationError(
				this.getNode(),
				'The selected Markup input field must contain a string.',
				{ itemIndex },
			);
		}

		return value;
	})();
	const nodeParameters = this.getNode().parameters;
	const defaultVariablesMode = typeVersion >= 1.2 ? 'input' : 'json';
	const variablesMode = Object.prototype.hasOwnProperty.call(nodeParameters, 'variablesMode')
		? (this.getNodeParameter('variablesMode', itemIndex) as string)
		: defaultVariablesMode;
	const variables = unwrapValidationResult(
		variablesMode === 'input'
			? { ok: true, value: { ...this.getInputData()[itemIndex].json } }
			: variablesMode === 'fields'
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
