import type { INodeProperties } from 'n8n-workflow';

export const playlistItemProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['playlistItem'],
			},
		},
		options: [
			{
				name: 'List',
				value: 'list',
				description: 'List playlist items in the authenticated TRMNL account',
				action: 'List playlist items',
			},
			{
				name: 'Set Visibility',
				value: 'setVisibility',
				description: 'Set whether a playlist item is eligible for future screen selection',
				action: 'Set playlist item visibility',
			},
		],
		default: 'list',
	},
	{
		displayName: 'Playlist Item ID',
		name: 'playlistItemId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '123456',
		displayOptions: {
			show: {
				resource: ['playlistItem'],
				operation: ['setVisibility'],
			},
		},
		description: 'Positive numeric ID returned by the Playlist Item List operation',
	},
	{
		displayName: 'Visible',
		name: 'visible',
		type: 'boolean',
		required: true,
		default: true,
		displayOptions: {
			show: {
				resource: ['playlistItem'],
				operation: ['setVisibility'],
			},
		},
		description: 'Whether the playlist item is eligible for future screen selection',
	},
	{
		displayName:
			'List preserves the playlist items returned by TRMNL. It does not assume pagination, ordering, grouping, filtering, or scheduling.',
		name: 'playlistItemListNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['playlistItem'],
				operation: ['list'],
			},
		},
	},
	{
		displayName:
			'Set Visibility controls playlist eligibility for future screen selection. It does not push content, Force Refresh, or directly refresh physical hardware.',
		name: 'playlistItemVisibilityNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['playlistItem'],
				operation: ['setVisibility'],
			},
		},
	},
];
