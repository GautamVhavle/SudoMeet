# SudoMeet Developer Platform

Phase 13 implementation — comprehensive developer platform for meetings-as-code.

## Features

- **Public API** — Create and manage meetings programmatically
- **API Keys** — Secure authentication with `sudomeet_live_*` keys
- **Webhooks** — Real-time event notifications with HMAC signatures
- **CLI** — Command-line interface (`npx sudomeet`)
- **Embed** — Iframe embeddable meeting widget

## API Authentication

All API requests require an API key in the Authorization header:

```bash
curl -H "Authorization: Bearer sudomeet_live_xxxxx" \
     https://sudomeet-v1.vercel.app/api/v1/meetings
```

Generate API keys at: [/settings/api-keys](https://sudomeet-v1.vercel.app/settings/api-keys)

## Public API Endpoints

### Create Meeting

```http
POST /api/v1/meetings
Authorization: Bearer sudomeet_live_xxxxx
Content-Type: application/json

{
  "title": "Team Sync",
  "roomCode": "dev-team-sync", // optional
  "maxParticipants": 4,
  "mediaProvider": "P2P" // or "LIVEKIT"
}
```

Response:

```json
{
  "id": "meeting_xxx",
  "roomCode": "dev-team-sync",
  "title": "Team Sync",
  "joinUrl": "https://sudomeet-v1.vercel.app/m/dev-team-sync",
  "createdAt": "2026-08-25T10:00:00Z"
}
```

## API Key Management

### Create API Key

```http
POST /api/keys
Content-Type: application/json

{
  "label": "Production Server",
  "expiresAt": "2027-01-01T00:00:00Z" // optional
}
```

Response (key shown ONCE):

```json
{
  "id": "key_xxx",
  "key": "sudomeet_live_abc123...",
  "keyPrefix": "sudomeet_live_abc1",
  "label": "Production Server",
  "createdAt": "2026-08-25T10:00:00Z",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

### List API Keys

```http
GET /api/keys
```

### Revoke API Key

```http
DELETE /api/keys/:id
```

## Webhooks

### Event Types

- `meeting.started` — Meeting became active
- `meeting.ended` — Meeting ended
- `participant.joined` — User joined meeting
- `participant.left` — User left meeting
- `recording.started` — Recording started
- `recording.ready` — Recording available
- `recording.failed` — Recording failed

### Create Webhook Endpoint

```http
POST /api/webhooks
Content-Type: application/json

{
  "apiKeyId": "key_xxx",
  "url": "https://your-server.com/webhooks",
  "events": ["meeting.started", "meeting.ended"]
}
```

Response (secret shown ONCE):

```json
{
  "id": "webhook_xxx",
  "url": "https://your-server.com/webhooks",
  "secret": "whsec_xxx",
  "events": ["meeting.started", "meeting.ended"],
  "active": true,
  "createdAt": "2026-08-25T10:00:00Z"
}
```

### Webhook Payload Format

Every webhook delivery includes:

**Headers:**
```
X-SudoMeet-Signature: <hmac-sha256-hex>
X-SudoMeet-Event: meeting.started
X-SudoMeet-Timestamp: 2026-08-25T10:00:00Z
X-SudoMeet-Delivery: evt_xxx
```

**Body:**
```json
{
  "event": "meeting.started",
  "timestamp": "2026-08-25T10:00:00Z",
  "data": {
    "meetingId": "meeting_xxx",
    "roomCode": "dev-team-sync",
    "title": "Team Sync",
    "startedAt": "2026-08-25T10:00:00Z"
  }
}
```

### Verify Webhook Signature

```typescript
import { createHmac } from "crypto";

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");
  
  return signature === expectedSignature;
}
```

### Webhook Retry Logic

Failed deliveries are retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: +1 second
- Attempt 3: +5 seconds
- Attempt 4: +15 seconds (final)

After 3 failed attempts, the event is marked as failed and moved to dead letter.

## CLI

```bash
# Install
npx sudomeet [command]

# Commands
npx sudomeet start              # Open SudoMeet
npx sudomeet join <room-code>   # Join meeting
npx sudomeet create             # Create meeting (requires API key)
npx sudomeet list               # List meetings (requires API key)
npx sudomeet api-key            # Manage API keys
```

## Embed Widget

Embed meetings in your app:

```html
<iframe
  src="https://sudomeet-v1.vercel.app/embed/<room-code>"
  width="100%"
  height="600"
  allow="camera; microphone; display-capture"
  allowfullscreen
></iframe>
```

## Security

### API Keys

- Format: `sudomeet_live_<43-char-base64url>`
- Storage: Only SHA-256 hash stored in database
- Display: Only key prefix (`sudomeet_live_abc1`) shown in UI
- Verification: Constant-time comparison to prevent timing attacks
- Shown ONCE at creation — never retrievable

### Webhooks

- **HMAC-SHA256** signatures on all payloads
- **Timestamp** header for replay prevention
- **Secret** per endpoint (generated on creation)
- **Retry** with exponential backoff
- **Dead letter** after max attempts

## Rate Limits

Phase 13 has no rate limits. Future phases will add:
- 100 req/min per API key
- 1000 meetings/day per user
- 10 webhooks per API key

## Examples

### Node.js

```javascript
const response = await fetch("https://sudomeet-v1.vercel.app/api/v1/meetings", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sudomeet_live_xxx",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: "Team Sync"
  })
});

const meeting = await response.json();
console.log(`Join at: ${meeting.joinUrl}`);
```

### Python

```python
import requests

response = requests.post(
    "https://sudomeet-v1.vercel.app/api/v1/meetings",
    headers={
        "Authorization": "Bearer sudomeet_live_xxx",
        "Content-Type": "application/json"
    },
    json={"title": "Team Sync"}
)

meeting = response.json()
print(f"Join at: {meeting['joinUrl']}")
```

### cURL

```bash
curl -X POST https://sudomeet-v1.vercel.app/api/v1/meetings \
  -H "Authorization: Bearer sudomeet_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"title": "Team Sync"}'
```

## Next Steps

- Generate an API key at [/settings/api-keys](/settings/api-keys)
- Create your first meeting via API
- Set up webhooks for event notifications
- Embed meetings in your application

## Future Enhancements (Beyond Phase 13)

- REST API for meeting management (list, update, delete)
- GraphQL API
- WebSocket real-time updates
- SDK packages (`@sudomeet/node`, `@sudomeet/react`)
- OAuth 2.0 / JWT authentication
- Rate limiting and quotas
- Analytics API
- Custom branding for embeds
