import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { trmnlAccountApiRequest } from '../transport';
import { normalizeResponse } from '../utils';

function getPlaylistItemId(executeFunctions: IExecuteFunctions, itemIndex: number): number {
	const value = String(executeFunctions.getNodeParameter('playlistItemId', itemIndex)).trim();
	const numericValue = Number(value);

	if (!/^\d+$/.test(value) || !Number.isSafeInteger(numericValue) || numericValue <= 0) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Playlist Item ID must be a positive integer.',
			{ itemIndex },
		);
	}

	return numericValue;
}

export async function listPlaylistItems(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const response = await trmnlAccountApiRequest.call(
		this,
		{
			method: 'GET',
			url: '/api/playlists/items',
		},
		{
			itemIndex,
			operation: 'list',
			operationLabel: 'listing Playlist Items',
			resource: 'playlistItem',
			target: 'Playlist Item list',
		},
	);
	const normalizedResponse = normalizeResponse(response);

	if (!Array.isArray(normalizedResponse.data)) {
		return [normalizedResponse];
	}

	return normalizedResponse.data.map((playlistItem) => normalizeResponse(playlistItem));
}

export async function setPlaylistItemVisibility(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const playlistItemId = getPlaylistItemId(this, itemIndex);
	const visible = this.getNodeParameter('visible', itemIndex);

	if (typeof visible !== 'boolean') {
		throw new NodeOperationError(this.getNode(), 'Visible must resolve to a boolean.', {
			itemIndex,
		});
	}

	const response = await trmnlAccountApiRequest.call(
		this,
		{
			method: 'PATCH',
			url: `/api/playlists/items/${playlistItemId}`,
			headers: {
				'Content-Type': 'application/json',
			},
			body: { visible },
		},
		{
			itemIndex,
			operation: 'setVisibility',
			operationLabel: 'setting Playlist Item visibility',
			resource: 'playlistItem',
			target: 'Playlist Item',
			write: true,
		},
	);

	return {
		operation: 'setVisibility',
		success: true,
		playlistItemId,
		visible,
		response: normalizeResponse(response),
	};
}
