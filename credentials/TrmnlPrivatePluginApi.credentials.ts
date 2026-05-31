import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TrmnlPrivatePluginApi implements ICredentialType {
	name = 'trmnlPrivatePluginApi';

	displayName = 'TRMNL Private Plugin API';

	icon = 'file:../nodes/Trmnl/trmnl.svg' as const;

	documentationUrl = 'https://docs.trmnl.com/go/private-plugins/webhooks';

	properties: INodeProperties[] = [
		{
			displayName: 'Webhook URL or UUID',
			name: 'webhookUrlOrUuid',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			placeholder: 'https://trmnl.com/api/custom_plugins/asdfqwerty1234',
			description:
				'The webhook URL from a TRMNL Private Plugin, or just its Plugin Setting UUID',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			url: '={{$credentials.webhookUrlOrUuid.startsWith("http") ? $credentials.webhookUrlOrUuid : "https://trmnl.com/api/custom_plugins/" + $credentials.webhookUrlOrUuid}}',
			method: 'GET',
		},
	};
}
