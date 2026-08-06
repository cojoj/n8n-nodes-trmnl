import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TrmnlPollingHeaderAuthApi implements ICredentialType {
	name = 'trmnlPollingHeaderAuthApi';

	displayName = 'TRMNL Polling Header Auth API';

	icon = {
		light: 'file:../nodes/Trmnl/trmnl.svg',
		dark: 'file:../nodes/Trmnl/trmnl.dark.svg',
	} as const;

	documentationUrl = 'https://help.trmnl.com/en/articles/9510536-private-plugins';

	properties: INodeProperties[] = [
		{
			displayName:
				'Enter the same header name and value in the TRMNL Private Plugin Polling Headers. The value is encrypted by n8n and is not emitted by the trigger.',
			name: 'pollingHeaderNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Header Name',
			name: 'headerName',
			type: 'string',
			default: 'Authorization',
			required: true,
			placeholder: 'X-TRMNL-Token',
		},
		{
			displayName: 'Header Value',
			name: 'headerValue',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];
}
