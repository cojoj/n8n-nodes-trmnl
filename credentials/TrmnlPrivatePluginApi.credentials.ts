import type {
	IAuthenticate,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { normalizePrivatePluginEndpoint } from '../nodes/Trmnl/helpers/payload';

export class TrmnlPrivatePluginApi implements ICredentialType {
	name = 'trmnlPrivatePluginApi';

	displayName = 'TRMNL Private Plugin API';

	icon = {
		light: 'file:../nodes/Trmnl/trmnl.svg',
		dark: 'file:../nodes/Trmnl/trmnl.dark.svg',
	} as const;

	documentationUrl = 'https://docs.trmnl.com/go/private-plugins/webhooks';

	properties: INodeProperties[] = [
		{
			displayName:
				'Use this credential for Private Plugin operations. The plugin must be saved and use the Webhook strategy.',
			name: 'privatePluginNotice',
			type: 'notice',
			default: '',
		},
		// eslint-disable-next-line @n8n/community-nodes/credential-unnecessary-password -- The saved webhook URL contains the secret plugin UUID.
		{
			displayName: 'Webhook URL or Plugin Setting UUID',
			name: 'webhookUrlOrUuid',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			placeholder: 'https://trmnl.com/api/custom_plugins/your-plugin-uuid',
			description:
				'The Webhook URL from the saved Private Plugin, or only its Plugin Setting UUID',
		},
	];

	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		const endpoint = normalizePrivatePluginEndpoint(
			String(credentials.webhookUrlOrUuid ?? ''),
		);

		if (!endpoint.ok) {
			throw new Error(endpoint.error);
		}

		return {
			...requestOptions,
			url: endpoint.value,
		};
	};

	test: ICredentialTestRequest = {
		request: {
			url: 'https://trmnl.com',
			method: 'GET',
		},
	};
}
