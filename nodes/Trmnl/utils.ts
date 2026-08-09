import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function normalizeResponse(response: unknown): IDataObject {
	if (response && typeof response === 'object' && !Array.isArray(response)) {
		return response as IDataObject;
	}

	return {
		data: response as IDataObject[string],
	};
}

export function unwrapValidationResult<T>(
	result: { ok: true; value: T } | { ok: false; error: string },
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): T {
	if (result.ok) {
		return result.value;
	}

	throw new NodeOperationError(executeFunctions.getNode(), result.error, { itemIndex });
}
