import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TrmnlAccountApi implements ICredentialType {
	name = 'trmnlAccountApi';

	displayName = 'TRMNL Account API';

	icon = 'file:../nodes/Trmnl/trmnl.svg' as const;

	documentationUrl = 'https://docs.trmnl.com/go/private-api/account';

	properties: INodeProperties[] = [
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
			description: 'TRMNL account API key from your account settings',
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
