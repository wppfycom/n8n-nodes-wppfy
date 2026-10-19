import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type IHttpRequestMethods,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';

const EVENTS = [
	{ name: 'Call', value: 'call', description: 'VoIP call events' },
	{ name: 'Chat Labels', value: 'chat_labels', description: 'Labels added to or removed from chats' },
	{ name: 'Chats', value: 'chats', description: 'Chat changes' },
	{ name: 'Connection', value: 'connection', description: 'Instance connection state changes' },
	{ name: 'Contacts', value: 'contacts', description: 'Address book updates' },
	{ name: 'Groups', value: 'groups', description: 'Group changes' },
	{ name: 'History', value: 'history', description: 'Message history received' },
	{ name: 'Labels', value: 'labels', description: 'Label management' },
	{ name: 'Message Updates', value: 'messages_update', description: 'Updates to existing messages (delivery, read, edits)' },
	{ name: 'Messages', value: 'messages', description: 'New messages' },
	{ name: 'Newsletter Messages', value: 'newsletter_messages', description: 'New posts in WhatsApp channels' },
	{ name: 'Presence', value: 'presence', description: 'Presence changes (online, typing...)' },
	{ name: 'Status Posts', value: 'status_posts', description: 'Status (stories) posts from contacts and groups' },
];

const EXCLUDE_FILTERS = [
	{ name: 'Groups', value: 'isGroupYes', description: 'Ignore messages in groups' },
	{ name: 'Private Chats', value: 'isGroupNo', description: 'Ignore messages in private chats' },
	{ name: 'Received Messages', value: 'fromMeNo', description: 'Ignore messages received from other people' },
	{ name: 'Sent by API', value: 'wasSentByApi', description: 'Ignore messages sent through the API (prevents reply loops)' },
	{ name: 'Sent by Me', value: 'fromMeYes', description: 'Ignore messages sent by the connected account' },
	{ name: 'Not Sent by API', value: 'wasNotSentByApi', description: 'Ignore messages that were not sent through the API' },
];

interface WebhookEntry {
	id?: string;
	url?: string;
	enabled?: boolean;
	events?: string[];
	excludeMessages?: string[];
}

async function wppfyRequest(this: IHookFunctions, method: IHttpRequestMethods, body?: IDataObject) {
	const credentials = await this.getCredentials('wppfyApi');
	const baseURL = String(credentials.baseUrl || 'https://api.wppfy.com').replace(/\/$/, '');
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'wppfyApi', {
			method,
			baseURL,
			url: '/webhook',
			body,
			json: true,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// The API may return the registered URL as-is or wrapped by a forwarding layer that carries it
// URL-encoded, so match both forms.
const isSameUrl = (registered: string | undefined, webhookUrl: string) =>
	!!registered && (registered === webhookUrl || registered.includes(encodeURIComponent(webhookUrl)));

const sameItems = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((item) => b.includes(item));

const webhookSettings = (context: IHookFunctions, webhookUrl: string): IDataObject => ({
	url: webhookUrl,
	enabled: true,
	events: context.getNodeParameter('events', []) as string[],
	excludeMessages: context.getNodeParameter('excludeMessages', []) as string[],
	addUrlEvents: false,
	addUrlTypesMessages: false,
});

const toList = (response: unknown): WebhookEntry[] => (Array.isArray(response) ? (response as WebhookEntry[]) : []);

export class WppfyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WppFy Trigger',
		name: 'wppfyTrigger',
		icon: 'file:wppfy.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when WhatsApp events happen on a WppFy instance',
		defaults: {
			name: 'WppFy Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'wppfyApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'When the workflow is activated, a webhook is added to the instance; it is removed when the workflow is deactivated. Existing webhooks of the instance are kept.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: EVENTS,
				default: ['messages'],
				required: true,
				description: 'Events that start the workflow',
			},
			{
				displayName: 'Ignore Messages',
				name: 'excludeMessages',
				type: 'multiOptions',
				options: EXCLUDE_FILTERS,
				default: ['wasSentByApi'],
				description:
					'Message filters applied by WppFy before sending the event. Keep "Sent by API" to avoid loops when the workflow replies.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Instance Token',
						name: 'includeToken',
						type: 'boolean',
						default: false,
						description: 'Whether to keep the instance token sent in the event payload. It is removed by default because it is a secret.',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const existing = toList(await wppfyRequest.call(this, 'GET')).find((w) => isSameUrl(w.url, webhookUrl));
				if (!existing || !existing.id) return false;
				webhookData.webhookId = existing.id;

				// The webhook may have been registered with other events/filters before the node was edited.
				const settings = webhookSettings(this, webhookUrl);
				const upToDate =
					existing.enabled !== false &&
					sameItems(existing.events, settings.events as string[]) &&
					sameItems(existing.excludeMessages, settings.excludeMessages as string[]);
				if (!upToDate) {
					await wppfyRequest.call(this, 'POST', { action: 'update', id: existing.id, ...settings });
				}
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const response = await wppfyRequest.call(this, 'POST', { action: 'add', ...webhookSettings(this, webhookUrl) });

				let created = toList(response).find((w) => isSameUrl(w.url, webhookUrl));
				if (!created) {
					created = toList(await wppfyRequest.call(this, 'GET')).find((w) => isSameUrl(w.url, webhookUrl));
				}
				if (!created || !created.id) return false;
				webhookData.webhookId = created.id;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.webhookId) return true;
				try {
					await wppfyRequest.call(this, 'POST', {
						action: 'delete',
						id: webhookData.webhookId as string,
						url: this.getNodeWebhookUrl('default') as string,
					});
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = { ...(this.getBodyData() as IDataObject) };
		const events = this.getNodeParameter('events', []) as string[];
		const options = this.getNodeParameter('options', {}) as IDataObject;

		if (body.EventType && events.length && !events.includes(String(body.EventType))) {
			return {};
		}
		if (!options.includeToken) delete body.token;

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
