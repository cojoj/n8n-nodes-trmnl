import type { IDataObject, IExecuteFunctions, JsonObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function normalizeResponse(response: unknown): IDataObject {
	if (response && typeof response === 'object' && !Array.isArray(response)) {
		return response as IDataObject;
	}

	return {
		data: response as IDataObject[string],
	};
}

export function isApiError(error: unknown): error is JsonObject {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const maybeApiError = error as { response?: unknown; statusCode?: unknown; httpCode?: unknown };

	return Boolean(maybeApiError.response ?? maybeApiError.statusCode ?? maybeApiError.httpCode);
}

export function getSanitizedApiErrorMessage(error: unknown): string | undefined {
	if (!(error instanceof Error)) {
		return undefined;
	}

	return (error as Error & { trmnlSanitized?: unknown }).trmnlSanitized === true
		? error.message
		: undefined;
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
