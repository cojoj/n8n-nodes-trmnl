import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TrmnlAccountApi implements ICredentialType {
	name = 'trmnlAccountApi';

	displayName = 'TRMNL Account API';

	icon = {
		light: 'file:../nodes/Trmnl/trmnl.svg',
		dark: 'file:../nodes/Trmnl/trmnl.dark.svg',
	} as const;

	documentationUrl = 'https://docs.trmnl.com/go/private-api/account';

	properties: INodeProperties[] = [
		{
			displayName:
				'No current TRMNL node operation uses this credential. It is registered for future account, device, and plugin-management operations.',
			name: 'accountApiNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			placeholder: 'user_xxxxxx',
			description:
				'TRMNL Account API key from account settings. A developer license is required. Do not enter a Private Plugin UUID here.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://trmnl.com',
			url: '/api/me',
			method: 'GET',
		},
	};
}
