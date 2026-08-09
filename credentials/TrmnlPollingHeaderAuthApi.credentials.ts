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
				'Enter the same pair in TRMNL Polling Headers as Name: Value (or name=value). n8n encrypts the value and the trigger never emits it. Credential testing validates this local configuration only; it does not contact TRMNL.',
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
			description: 'HTTP header name only, without a colon or value',
		},
		// eslint-disable-next-line @n8n/community-nodes/credential-unnecessary-password -- The incoming authentication header value is a secret.
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
