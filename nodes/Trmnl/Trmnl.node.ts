import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { trmnlProperties } from './descriptions';
import { routeTrmnlOperation } from './router';
import { getTrmnlApiErrorContext } from './transport';

export class Trmnl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TRMNL',
		name: 'trmnl',
		icon: { light: 'file:trmnl.svg', dark: 'file:trmnl.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send workflow data to TRMNL and manage account resources',
		defaults: {
			name: 'TRMNL',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'trmnlAccountApi',
				required: true,
				displayOptions: {
					show: {
						resource: ['device', 'playlistItem', 'pluginSetting'],
					},
				},
			},
			{
				name: 'trmnlPrivatePluginApi',
				required: true,
				displayOptions: {
					show: {
						resource: ['privatePlugin'],
					},
				},
			},
		],
		properties: trmnlProperties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const responseData = await routeTrmnlOperation.call(this, itemIndex);

				returnData.push(
					...responseData.map((data) => ({
						json: data,
						pairedItem: { item: itemIndex },
					})),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					const apiContext = getTrmnlApiErrorContext(error);

					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error',
							...(apiContext === undefined
								? {}
								: {
										operation: apiContext.operation,
										resource: apiContext.resource,
										...(apiContext.statusCode === undefined
											? {}
											: { statusCode: apiContext.statusCode }),
										...(apiContext.networkErrorCode === undefined
											? {}
											: { networkErrorCode: apiContext.networkErrorCode }),
										...(apiContext.retryAfter === undefined
											? {}
											: { retryAfter: apiContext.retryAfter }),
									}),
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex });
				}

				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}

				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}
