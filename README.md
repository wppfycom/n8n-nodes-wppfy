<p align="center">
  <img src="https://docs.wppfy.com/logo/logo.webp" width="200" alt="WppFy" />
</p>

<h1 align="center">n8n-nodes-wppfy</h1>

<p align="center">
  n8n community node for the <a href="https://wppfy.com">WppFy</a> WhatsApp API.
  <br />
  <a href="https://www.npmjs.com/package/n8n-nodes-wppfy"><img src="https://img.shields.io/npm/v/n8n-nodes-wppfy.svg" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT license" /></a>
</p>

Automate WhatsApp from [n8n](https://n8n.io) with two nodes:

- **WppFy**: send text, media, menus, carousels and PIX buttons, manage chats, contacts, groups, communities and channels, run your CRM and business catalog. Every endpoint of the [WppFy API reference](https://docs.wppfy.com/en/api-reference/start-here) is available as an operation, and the node can be used as a tool by n8n AI agents.
- **WppFy Trigger**: start workflows when messages and other WhatsApp events arrive. The webhook is registered and removed automatically.

- [Installation](#installation)
- [Credentials](#credentials)
- [Usage](#usage)
- [Receiving messages (WppFy Trigger)](#receiving-messages-wppfy-trigger)
- [Using with AI agents](#using-with-ai-agents)
- [Operations](#operations)
- [Compatibility](#compatibility)
- [Development](#development)
- [Resources](#resources)

## Installation

### n8n Cloud and self-hosted (UI)

1. Go to **Settings → Community Nodes**.
2. Click **Install**.
3. Enter `n8n-nodes-wppfy`, accept the risks notice and click **Install**.

### Self-hosted (CLI / Docker)

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-wppfy
# restart n8n
```

With Docker, run the command inside the container (or in the mounted `~/.n8n/nodes` volume) and restart it.

See the n8n guide on [installing community nodes](https://docs.n8n.io/integrations/community-nodes/installation/) for details.

## Credentials

Create a **WppFy API** credential:

| Field | Value |
| --- | --- |
| **Instance Token** | Token of your WhatsApp instance, from the [WppFy dashboard](https://wppfy.com/dashboard) |
| **Base URL** | `https://api.wppfy.com` (default, change only if instructed) |

Clicking **Save** tests the credential with `GET /instance/status`. Each credential is tied to one WhatsApp instance; create one credential per number.

## Usage

1. Add the **WppFy** node to a workflow.
2. Pick a **Resource** (for example *Send Message*) and an **Operation** (for example *Send text message*).
3. Fill in the required fields. Optional fields are under **Add Field** in **Additional Fields**.

### Example: send a text message

| Parameter | Value |
| --- | --- |
| Resource | Send Message |
| Operation | Send text message |
| Number | `5511999999999` (or a group ID ending in `@g.us`) |
| Text | `Hello {{ $json.name }}!` |

### Fields that take JSON

Fields with lists or objects (menu choices, carousel cards, group participants, product data, etc.) are JSON fields. You can type JSON directly or use an expression:

```json
["Option 1", "Option 2", "Option 3"]
```

```
{{ JSON.stringify($json.participants) }}
```

### Message placeholders

Send operations support placeholders such as `{{name}}`, `{{first_name}}` and `{{lead_email}}`, filled by WppFy with the chat's data. In n8n, write them inside a plain string (not an expression), or escape them in expressions as `{{ "{{name}}" }}`.

## Receiving messages (WppFy Trigger)

Add the **WppFy Trigger** node to start a workflow on WhatsApp events.

| Parameter | Description |
| --- | --- |
| **Events** | Events that start the workflow: Messages, Message Updates, Connection, Groups, Call, Presence, Chats, Labels, Contacts, Status Posts, Newsletter Messages... (default: Messages) |
| **Ignore Messages** | Filters applied by WppFy before sending: Sent by API, Sent by Me, Received Messages, Groups, Private Chats (default: Sent by API) |
| **Options → Include Instance Token** | Keep the instance token that comes in the payload. Off by default, since it is a secret |

How it works:

- When you **activate** the workflow, the node adds a webhook to the instance pointing to n8n. When you **deactivate** it, that webhook is removed.
- Webhooks you already have on the instance are not changed; the trigger adds its own.
- Each event becomes one item with the event payload (`EventType`, `message`, `chat`, `owner`, ...).
- Keep **Ignore Messages → Sent by API** if the workflow replies with the WppFy node; otherwise your own replies trigger the workflow again.
- n8n must be reachable from the internet (n8n Cloud, or self-hosted with a public `WEBHOOK_URL`) for events to arrive.

Prefer the raw approach? A regular **Webhook** node works too: copy its production URL and configure it as described in [Configure Webhook](https://docs.wppfy.com/en/api-reference/webhooks).

## Using with AI agents

The node is marked as usable as a tool. In an **AI Agent** node, add **WppFy** as a tool and pick the operation the agent may use (for example *Send text message*), letting the model fill fields with `$fromAI()`.

## Operations

Operations are grouped by resource, matching the sections of the [API reference](https://docs.wppfy.com/en/api-reference/start-here).

<!-- operations:start -->
17 resources, 136 operations.

<details>
<summary><b>Instance</b> (7)</summary>

| Operation | Endpoint |
| --- | --- |
| Check the initial history processing | `GET /instance/history-sync/status` |
| Connect instance to WhatsApp | `POST /instance/connect` |
| Disconnect instance | `POST /instance/disconnect` |
| Get current limits for new WhatsApp conversations | `GET /instance/wa_messages_limits` |
| Get instance status | `GET /instance/status` |
| Restart the instance connection | `POST /instance/reset` |
| Update instance presence status | `POST /instance/presence` |

</details>

<details>
<summary><b>Proxy</b> (4)</summary>

| Operation | Endpoint |
| --- | --- |
| Configure or change the proxy | `POST /instance/proxy` |
| Get instance proxy configuration | `GET /instance/proxy` |
| Internal Proxy - List available cities | `GET /proxy-managed/cities` |
| Internal Proxy - List available countries | `GET /proxy-managed/countries` |

</details>

<details>
<summary><b>Profile</b> (2)</summary>

| Operation | Endpoint |
| --- | --- |
| Change WhatsApp profile image | `POST /profile/image` |
| Change WhatsApp profile name | `POST /profile/name` |

</details>

<details>
<summary><b>Business</b> (13)</summary>

| Operation | Endpoint |
| --- | --- |
| Create catalog collection | `POST /business/catalog/collection/create` |
| Create or edit a catalog product | `POST /business/catalog/save` |
| Delete a catalog product | `POST /business/catalog/delete` |
| Delete catalog collection | `DELETE /business/catalog/collection/{id}` |
| Edit catalog collection | `PATCH /business/catalog/collection/{id}` |
| Get business categories | `GET /business/get/categories` |
| Get information about a catalog product | `POST /business/catalog/info` |
| Get the business profile | `POST /business/get/profile` |
| Hide a product from the catalog | `POST /business/catalog/hide` |
| List catalog collections | `GET /business/catalog/collection/list` |
| List catalog products | `POST /business/catalog/list` |
| Show a catalog product | `POST /business/catalog/show` |
| Update the business profile | `POST /business/update/profile` |

</details>

<details>
<summary><b>Calls</b> (2)</summary>

| Operation | Endpoint |
| --- | --- |
| Reject incoming call | `POST /call/reject` |
| Start voice call | `POST /call/make` |

</details>

<details>
<summary><b>Send Message</b> (13)</summary>

| Operation | Endpoint |
| --- | --- |
| Request payment | `POST /send/request-payment` |
| Request user location | `POST /send/location-button` |
| Send contact card (vCard) | `POST /send/contact` |
| Send event | `POST /send/event` |
| Send geographical location | `POST /send/location` |
| Send interactive menu (buttons, carousel, list, or poll) | `POST /send/menu` |
| Send media (image, video, audio, or document) | `POST /send/media` |
| Send media carousel with buttons | `POST /send/carousel` |
| Send PIX button | `POST /send/pix-button` |
| Send presence update | `POST /message/presence` |
| Send status (stories) | `POST /send/status` |
| Send text message | `POST /send/text` |
| Update payment and order | `POST /message/payment/status` |

</details>

<details>
<summary><b>Async Message</b> (3)</summary>

| Operation | Endpoint |
| --- | --- |
| Clear direct-send async queue | `DELETE /message/async` |
| Configure delay between async messages | `POST /instance/updateDelaySettings` |
| Get the direct send async queue | `GET /message/async` |

</details>

<details>
<summary><b>Message Actions and Search</b> (10)</summary>

| Operation | Endpoint |
| --- | --- |
| Delete Message For Everyone | `POST /message/delete` |
| Download file from a message | `POST /message/download` |
| Edit a sent message | `POST /message/edit` |
| Group message status | `POST /message/status` |
| Mark messages as read | `POST /message/markread` |
| Pins or unpins a message | `POST /message/pin` |
| Recover message that did not open | `POST /message/reload` |
| Request on-demand history for a chat | `POST /message/history-sync` |
| Search messages in a chat | `POST /message/find` |
| Send reaction to a message | `POST /message/react` |

</details>

<details>
<summary><b>Chats</b> (12)</summary>

| Operation | Endpoint |
| --- | --- |
| Archive/unarchive chat | `POST /chat/archive` |
| Configure disappearing messages in a private chat | `POST /chat/ephemeral` |
| Deletes chat | `POST /chat/delete` |
| Edit chat internal notes | `POST /chat/notes/edit` |
| Get a chat's avatar | `POST /chat/avatar` |
| Get chat counters | `GET /chat/totalcount` |
| Get the chat's internal notes | `POST /chat/notes` |
| Mark chat as read/unread | `POST /chat/read` |
| Mute chat | `POST /chat/mute` |
| Pin/unpin chat | `POST /chat/pin` |
| Reload the chat's internal notes in WhatsApp | `POST /chat/notes/refresh` |
| Search chats with filters | `POST /chat/find` |

</details>

<details>
<summary><b>Contacts</b> (6)</summary>

| Operation | Endpoint |
| --- | --- |
| Adds a contact to the address book | `POST /contact/add` |
| Check Numbers on WhatsApp | `POST /chat/check` |
| Get chat details | `POST /chat/details` |
| List all contacts with pagination | `POST /contacts/list` |
| Removes a contact from the address book | `POST /contact/remove` |
| Returns the list of WhatsApp contacts | `GET /contacts` |

</details>

<details>
<summary><b>Blocklist</b> (2)</summary>

| Operation | Endpoint |
| --- | --- |
| Blocks or unblocks a WhatsApp contact | `POST /chat/block` |
| List blocked contacts | `GET /chat/blocklist` |

</details>

<details>
<summary><b>Labels</b> (4)</summary>

| Operation | Endpoint |
| --- | --- |
| Create, edit or delete label | `POST /label/edit` |
| Fetch all labels | `GET /labels` |
| Manages a chat's labels | `POST /chat/labels` |
| Start WhatsApp label refresh | `POST /labels/refresh` |

</details>

<details>
<summary><b>Groups and Communities</b> (20)</summary>

| Operation | Endpoint |
| --- | --- |
| Configure approval for joining the group | `POST /group/updateJoinApproval` |
| Configure disappearing messages in a group | `POST /group/ephemeral` |
| Configure group editing permissions | `POST /group/updateLocked` |
| Configure group messaging permissions | `POST /group/updateAnnounce` |
| Configure who can add new members to the group | `POST /group/updateMemberAddMode` |
| Create a community | `POST /community/create` |
| Create a new group | `POST /group/create` |
| Generate invite link for a group | `GET /group/invitelink/{groupJID}` |
| Get group details and members | `POST /group/info` |
| Get group information by invite code | `POST /group/inviteInfo` |
| Join a group using an invite code | `POST /group/join` |
| Leave a group | `POST /group/leave` |
| List all groups (legacy) | `GET /group/list` |
| List groups in pages (recommended) | `POST /group/list` |
| Manage group participants | `POST /group/updateParticipants` |
| Manage groups in a community | `POST /community/editgroups` |
| Reset group invite code | `POST /group/resetInviteCode` |
| Update group description | `POST /group/updateDescription` |
| Update group image | `POST /group/updateImage` |
| Update group name | `POST /group/updateName` |

</details>

<details>
<summary><b>Newsletters and Channels</b> (26)</summary>

| Operation | Endpoint |
| --- | --- |
| Accept channel admin invitation | `POST /newsletter/admin/accept` |
| Create channel | `POST /newsletter/create` |
| Delete channel | `POST /newsletter/delete` |
| Delete recent channel message | `POST /newsletter/messages/delete` |
| Edit recent channel message | `POST /newsletter/messages/edit` |
| Fetch channel message updates | `POST /newsletter/updates` |
| Fetch channel messages | `POST /newsletter/messages` |
| Find channel by invite key link | `POST /newsletter/link` |
| Follow channel | `POST /newsletter/follow` |
| Get channel information | `POST /newsletter/info` |
| Invite channel admin | `POST /newsletter/admin/invite` |
| List subscribed channels | `GET /newsletter/list` |
| Mark channel posts as viewed | `POST /newsletter/viewed` |
| Mute channel | `POST /newsletter/mute` |
| React to a channel post | `POST /newsletter/reaction` |
| Remove channel admin | `POST /newsletter/admin/remove` |
| Revoke channel admin invite | `POST /newsletter/admin/revoke` |
| Search public channels | `POST /newsletter/search` |
| Subscribe to temporary live updates of a channel | `POST /newsletter/subscribe` |
| Transfer channel owner | `POST /newsletter/owner/transfer` |
| Unfollow channel | `POST /newsletter/unfollow` |
| Unmute channel | `POST /newsletter/unmute` |
| Update channel description | `POST /newsletter/description` |
| Update channel name | `POST /newsletter/name` |
| Update channel picture | `POST /newsletter/picture` |
| Update channel settings | `POST /newsletter/settings` |

</details>

<details>
<summary><b>Quick Replies</b> (5)</summary>

| Operation | Endpoint |
| --- | --- |
| Create quick reply | `POST /quick-replies` |
| Delete quick reply | `DELETE /quick-replies/{id}` |
| Edit quick reply | `PATCH /quick-replies/{id}` |
| List quick replies | `GET /quick-replies` |
| View quick reply | `GET /quick-replies/{id}` |

</details>

<details>
<summary><b>CRM</b> (5)</summary>

| Operation | Endpoint |
| --- | --- |
| Completes conversations (awaiting you) | `POST /lead/resolve` |
| Creates, edits or deletes a lead tag | `POST /lead/tags/edit` |
| Edits lead information | `POST /chat/editLead` |
| List lead tags | `GET /lead/tags` |
| Name lead custom fields | `POST /instance/updateFieldsMap` |

</details>

<details>
<summary><b>Chatwoot Integration</b> (2)</summary>

| Operation | Endpoint |
| --- | --- |
| Get Chatwoot configuration | `GET /chatwoot/config` |
| Update Chatwoot configuration | `PUT /chatwoot/config` |

</details>
<!-- operations:end -->

The streaming endpoint `GET /sse` is not included; use the **WppFy Trigger** to receive events in n8n.

## Compatibility

- Tested on n8n `2.43`; requires a recent n8n `1.x` or `2.x`
- Node.js 20 or later

## Development

The operations are generated from the OpenAPI file in [`openapi/openapi.json`](openapi/openapi.json), a copy of the docs' `openapi-en.json`.

```bash
npm install
npm run build   # regenerate operations, compile to dist/ and refresh this README
npm test        # build + sanity checks on the generated node
```

When the API changes, replace `openapi/openapi.json`, run `npm run build`, bump the version and publish.

To try the node locally, point n8n to the build output:

```bash
N8N_CUSTOM_EXTENSIONS="$(pwd)/dist" n8n start
```

## Resources

- [WppFy API documentation](https://docs.wppfy.com/en/api-reference/start-here)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- Support: [contact@wppfy.com](mailto:contact@wppfy.com)

## License

[MIT](LICENSE)
