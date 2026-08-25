# SudoMeet API Documentation

Complete API reference for the SudoMeet developer platform.

## Base URL

```
Production: https://sudomeet.vercel.app
Self-hosted: https://your-domain.com
```

## Authentication

All API requests require an API key in the `Authorization` header:

```http
Authorization: Bearer sudomeet_live_xxxxxxxxxxxxx
```

### Creating an API Key

**Via UI** (recommended):

1. Log in to SudoMeet
2. Go to [Settings → API Keys](https://sudomeet.vercel.app/settings/api-keys)
3. Click **Create API Key**
4. Copy the key (shown only once)

**Via API**:

```http
POST /api/keys
Content-Type: application/json
Cookie: <session cookie>

{
  "label": "My API Key",
  "expiresAt": "2027-01-01T00:00:00Z"  // optional
}
```

Response:

```json
{
  "id": "key_abc123",
  "key": "sudomeet_live_xxxxxxxxxxxxxxxxxxxxxx",
  "keyPrefix": "sudomeet_live_xxxx",
  "label": "My API Key",
  "createdAt": "2026-08-25T10:00:00Z",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

**⚠️ Important**: The full `key` is returned only once. Store it securely — it
cannot be retrieved again.

### Key Formats

- **Live keys**: `sudomeet_live_` prefix (production use)
- **Test keys**: `sudomeet_test_` prefix (sandbox, not yet implemented)

## Endpoints

### Meetings

#### Create Meeting

```http
POST /api/v1/meetings
```

**Request:**

```json
{
  "title": "Team Standup",
  "roomCode": "team-standup",  // optional, auto-generated if omitted
  "maxParticipants": 4,        // optional, default: 10
  "mediaProvider": "P2P"       // optional, "P2P" or "LIVEKIT", default: "P2P"
}
```

**Response (201 Created):**

```json
{
  "id": "meeting_abc123",
  "roomCode": "team-standup",
  "title": "Team Standup",
  "joinUrl": "https://sudomeet.vercel.app/m/team-standup",
  "embedUrl": "https://sudomeet.vercel.app/embed/team-standup",
  "mediaProvider": "P2P",
  "maxParticipants": 4,
  "status": "SCHEDULED",
  "createdAt": "2026-08-25T10:00:00Z",
  "createdBy": {
    "id": "user_xyz",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Validation Errors (400 Bad Request):**

```json
{
  "error": "Validation failed",
  "details": {
    "title": "Title is required",
    "roomCode": "Room code must be 3-32 characters (lowercase alphanumeric and hyphens only)"
  }
}
```

**Conflict (409):**

```json
{
  "error": "Room code already exists",
  "roomCode": "team-standup"
}
```

#### Get Meeting

```http
GET /api/v1/meetings/:id
```

**Response (200 OK):**

```json
{
  "id": "meeting_abc123",
  "roomCode": "team-standup",
  "title": "Team Standup",
  "joinUrl": "https://sudomeet.vercel.app/m/team-standup",
  "embedUrl": "https://sudomeet.vercel.app/embed/team-standup",
  "mediaProvider": "P2P",
  "maxParticipants": 4,
  "status": "ACTIVE",
  "startedAt": "2026-08-25T10:05:00Z",
  "endedAt": null,
  "createdAt": "2026-08-25T10:00:00Z",
  "participants": [
    {
      "id": "participant_1",
      "displayName": "John Doe",
      "joinedAt": "2026-08-25T10:05:00Z",
      "isHost": true
    }
  ],
  "createdBy": {
    "id": "user_xyz",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Not Found (404):**

```json
{
  "error": "Meeting not found",
  "id": "meeting_invalid"
}
```

#### List Meetings

```http
GET /api/v1/meetings?status=ACTIVE&limit=10&offset=0
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | (all) | Filter by status: `SCHEDULED`, `ACTIVE`, `ENDED` |
| `limit` | number | 10 | Results per page (max 100) |
| `offset` | number | 0 | Pagination offset |

**Response (200 OK):**

```json
{
  "meetings": [
    {
      "id": "meeting_abc123",
      "roomCode": "team-standup",
      "title": "Team Standup",
      "status": "ACTIVE",
      "participantCount": 3,
      "createdAt": "2026-08-25T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

#### Update Meeting

```http
PATCH /api/v1/meetings/:id
```

**Request:**

```json
{
  "title": "Updated Title",         // optional
  "maxParticipants": 10,            // optional
  "status": "ENDED"                 // optional: end the meeting
}
```

**Response (200 OK):**

```json
{
  "id": "meeting_abc123",
  "roomCode": "team-standup",
  "title": "Updated Title",
  "maxParticipants": 10,
  "status": "ENDED",
  "endedAt": "2026-08-25T11:00:00Z"
}
```

**Authorization Error (403):**

Only the meeting creator or host can update a meeting.

```json
{
  "error": "Forbidden",
  "message": "Only the meeting host can update this meeting"
}
```

#### Delete Meeting

```http
DELETE /api/v1/meetings/:id
```

**Response (204 No Content)**

Soft delete: meeting is marked as deleted but remains in the database.

### API Keys

#### List API Keys

```http
GET /api/keys
```

**Response (200 OK):**

```json
{
  "keys": [
    {
      "id": "key_abc123",
      "keyPrefix": "sudomeet_live_xxxx",
      "label": "Production Server",
      "createdAt": "2026-08-01T00:00:00Z",
      "expiresAt": "2027-01-01T00:00:00Z",
      "lastUsedAt": "2026-08-25T09:00:00Z"
    }
  ]
}
```

**Note**: Full keys are never returned (only on creation).

#### Revoke API Key

```http
DELETE /api/keys/:id
```

**Response (204 No Content)**

The key is permanently deleted and can no longer be used.

### Webhooks

#### Register Webhook

```http
POST /api/webhooks
```

**Request:**

```json
{
  "url": "https://your-server.com/webhooks/sudomeet",
  "events": ["meeting.started", "meeting.ended", "participant.joined"],
  "secret": "your-webhook-secret"  // optional, auto-generated if omitted
}
```

**Response (201 Created):**

```json
{
  "id": "webhook_abc123",
  "url": "https://your-server.com/webhooks/sudomeet",
  "events": ["meeting.started", "meeting.ended", "participant.joined"],
  "secret": "whsec_xxxxxxxxxxxxxx",
  "createdAt": "2026-08-25T10:00:00Z",
  "isActive": true
}
```

#### List Webhooks

```http
GET /api/webhooks
```

**Response (200 OK):**

```json
{
  "webhooks": [
    {
      "id": "webhook_abc123",
      "url": "https://your-server.com/webhooks/sudomeet",
      "events": ["meeting.started", "meeting.ended"],
      "isActive": true,
      "createdAt": "2026-08-25T10:00:00Z",
      "lastDeliveredAt": "2026-08-25T11:00:00Z"
    }
  ]
}
```

#### Delete Webhook

```http
DELETE /api/webhooks/:id
```

**Response (204 No Content)**

## Webhook Events

### Event Types

| Event | Description |
|-------|-------------|
| `meeting.started` | Meeting became active (first participant joined) |
| `meeting.ended` | Meeting ended (last participant left or manually ended) |
| `participant.joined` | User or guest joined meeting |
| `participant.left` | User or guest left meeting |
| `recording.started` | Recording started |
| `recording.completed` | Recording finished and uploaded |

### Payload Format

All webhook payloads follow this structure:

```json
{
  "id": "evt_abc123",
  "type": "meeting.started",
  "timestamp": "2026-08-25T10:05:00Z",
  "data": {
    // Event-specific data (see examples below)
  }
}
```

### Signature Verification

Every webhook request includes an `X-SudoMeet-Signature` header with an
HMAC-SHA256 signature:

```
X-SudoMeet-Signature: sha256=abc123...
```

**Verify in your webhook handler:**

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Express example
app.post('/webhooks/sudomeet', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-sudomeet-signature'];
  const payload = req.body;

  if (!verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(payload);
  console.log('Received event:', event.type);

  // Process event...

  res.status(200).send('OK');
});
```

### Event Examples

#### `meeting.started`

```json
{
  "id": "evt_abc123",
  "type": "meeting.started",
  "timestamp": "2026-08-25T10:05:00Z",
  "data": {
    "meetingId": "meeting_abc123",
    "roomCode": "team-standup",
    "title": "Team Standup",
    "startedAt": "2026-08-25T10:05:00Z"
  }
}
```

#### `participant.joined`

```json
{
  "id": "evt_abc124",
  "type": "participant.joined",
  "timestamp": "2026-08-25T10:06:00Z",
  "data": {
    "meetingId": "meeting_abc123",
    "participantId": "participant_xyz",
    "displayName": "Jane Smith",
    "isGuest": false,
    "joinedAt": "2026-08-25T10:06:00Z"
  }
}
```

#### `recording.completed`

```json
{
  "id": "evt_abc125",
  "type": "recording.completed",
  "timestamp": "2026-08-25T11:30:00Z",
  "data": {
    "meetingId": "meeting_abc123",
    "recordingId": "recording_xyz",
    "duration": 3600,
    "fileSize": 104857600,
    "downloadUrl": "https://recordings.sudomeet.app/recording_xyz.webm?token=..."
  }
}
```

### Delivery Guarantees

- **Retry policy**: 3 attempts with exponential backoff (1s, 5s, 25s)
- **Timeout**: 10 seconds per attempt
- **Expected response**: HTTP 200-299 (any 2xx status is considered success)
- **Failure handling**: After 3 failed attempts, the webhook is marked as failed
  (visible in dashboard)

## Rate Limits

| Tier | Requests per minute |
|------|---------------------|
| Free | 60 |
| Pro | 600 |

Rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1693123200
```

**Rate Limit Exceeded (429):**

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 30
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    // Optional field-specific errors (for validation)
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid or missing API key) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (e.g., room code already exists) |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

## SDK Examples

### Node.js

```javascript
const SUDOMEET_API_KEY = 'sudomeet_live_xxxxx';
const BASE_URL = 'https://sudomeet.vercel.app';

async function createMeeting(title, roomCode) {
  const response = await fetch(`${BASE_URL}/api/v1/meetings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUDOMEET_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, roomCode, maxParticipants: 4 }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

createMeeting('Team Sync', 'team-sync')
  .then(meeting => console.log('Meeting created:', meeting.joinUrl))
  .catch(err => console.error('Error:', err));
```

### Python

```python
import requests

SUDOMEET_API_KEY = 'sudomeet_live_xxxxx'
BASE_URL = 'https://sudomeet.vercel.app'

def create_meeting(title, room_code):
    response = requests.post(
        f'{BASE_URL}/api/v1/meetings',
        headers={'Authorization': f'Bearer {SUDOMEET_API_KEY}'},
        json={'title': title, 'roomCode': room_code, 'maxParticipants': 4}
    )
    response.raise_for_status()
    return response.json()

meeting = create_meeting('Team Sync', 'team-sync')
print(f"Meeting created: {meeting['joinUrl']}")
```

### cURL

```bash
curl -X POST https://sudomeet.vercel.app/api/v1/meetings \
  -H "Authorization: Bearer sudomeet_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Sync",
    "roomCode": "team-sync",
    "maxParticipants": 4
  }'
```

## CLI Usage

The SudoMeet CLI (`packages/cli`) provides a command-line interface to the API.

### Installation

```bash
npm install -g sudomeet-cli
# or use npx:
npx sudomeet <command>
```

### Authentication

```bash
sudomeet login
# Enter API key when prompted
```

### Commands

```bash
# Create meeting
sudomeet meetings create "Team Standup" --room-code team-standup --max-participants 4

# List meetings
sudomeet meetings list --status ACTIVE

# Get meeting details
sudomeet meetings get meeting_abc123

# End meeting
sudomeet meetings end meeting_abc123
```

## Embed Widget

Embed SudoMeet meetings in your website:

```html
<iframe
  src="https://sudomeet.vercel.app/embed/team-standup"
  width="100%"
  height="600"
  frameborder="0"
  allow="camera; microphone; display-capture"
></iframe>
```

**Query parameters:**

- `?name=John` — Pre-fill display name for guests
- `?hideLobby=true` — Skip lobby, join directly (requires name)

## Best Practices

1. **Store API keys securely**: Use environment variables, never commit to git
2. **Verify webhook signatures**: Always validate `X-SudoMeet-Signature` to
   prevent forged events
3. **Handle rate limits**: Implement exponential backoff for 429 responses
4. **Use idempotency**: Room codes are unique — use meaningful, deterministic
   codes to prevent duplicates
5. **Monitor webhook failures**: Check the dashboard for failed deliveries

## Support

- **Documentation**: [https://github.com/GautamVhavle/SudoMeet/tree/main/docs](https://github.com/GautamVhavle/SudoMeet/tree/main/docs)
- **Issues**: [https://github.com/GautamVhavle/SudoMeet/issues](https://github.com/GautamVhavle/SudoMeet/issues)
- **Discussions**: [https://github.com/GautamVhavle/SudoMeet/discussions](https://github.com/GautamVhavle/SudoMeet/discussions)
