import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WppfyApi implements ICredentialType {
	name = 'wppfyApi';

	displayName = 'WppFy API';

	icon: Icon = 'file:wppfy.png';

	documentationUrl = 'https://docs.wppfy.com/en/api-reference/start-here';

	properties: INodeProperties[] = [
		{
			displayName: 'Instance Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Token of the WhatsApp instance, available in the WppFy dashboard',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.wppfy.com',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				token: '={{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '/instance/status',
			method: 'GET',
		},
	};
}
