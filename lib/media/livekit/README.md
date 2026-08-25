# LiveKit Media Provider (Tier B)

This directory implements the **LiveKit SFU media provider** for SudoMeet's Tier B (100+ participant) video calls.

## Architecture

```
lib/media/livekit/
├── livekit-provider.ts    # LiveKitMediaProvider implementation
├── token.ts               # Token minting utilities
└── index.ts               # Barrel exports
```

## Configuration

LiveKit requires three environment variables (see `.env.example`):

```bash
# LiveKit server URL (wss:// or ws://)
LIVEKIT_URL=wss://your-livekit-server.example.com

# API credentials for minting join tokens
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### Deployment options

1. **LiveKit Cloud** (recommended for production): https://cloud.livekit.io
2. **Self-hosted**: Deploy LiveKit on your own infrastructure (see [LiveKit docs](https://docs.livekit.io/home/self-hosting/deployment/))

## Usage

### Creating a LiveKit meeting

Set `mediaProvider: "LIVEKIT"` when creating a meeting:

```ts
const meeting = await prisma.meeting.create({
  data: {
    // ... other fields
    mediaProvider: "LIVEKIT",
    maxParticipants: 100, // LiveKit scales beyond P2P limits
  },
});
```

### Obtaining a join token

Client-side code calls the token endpoint before connecting:

```ts
const response = await fetch("/api/livekit/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    meetingId: "meeting-id",
    participantName: "John Doe",
  }),
});

const { token, livekitUrl, roomName } = await response.json();
```

### Connecting to the room

Use the provider factory to create a LiveKit provider:

```ts
import { createMediaProvider } from "@/lib/media";

const provider = createMediaProvider({
  provider: "livekit",
  meetingId: meeting.id,
  localParticipantId: userId || guestId,
  localParticipantName: displayName,
  livekit: {
    livekitUrl,
    token,
  },
});

await provider.connect();
```

## Graceful fallback

If LiveKit credentials are missing:

- **Build/dev server**: No crash — credentials are validated lazily on first use
- **Token endpoint**: Returns `503 Service Unavailable` with helpful error message
- **Meeting creation**: Defaults to P2P if `MEDIA_PROVIDER` env var is not set

## Features

LiveKit provider implements the full `MediaProvider` interface:

- ✅ Audio/video track publishing
- ✅ Screen sharing
- ✅ Participant tracking (join/leave)
- ✅ Track mute/unmute events
- ✅ Reconnection handling
- ✅ Adaptive streaming (dynacast)
- ✅ Automatic subscription

## Differences from P2P provider

| Feature | P2P | LiveKit |
|---------|-----|---------|
| Topology | Mesh (peer-to-peer) | SFU (central server) |
| Signaling | Redis pub/sub + SSE | Built into LiveKit |
| Max participants | ~4 | 100+ |
| NAT traversal | Best-effort STUN | Reliable (TURN included) |
| Recording | Not available | Via LiveKit Egress |
| Infrastructure | None (Vercel + Upstash only) | LiveKit server required |

## See also

- [ADR-001: Media provider abstraction](../../../docs/adr/ADR-001-media-provider-abstraction.md)
- [ADR-004: Tier A P2P vs Tier B LiveKit](../../../docs/adr/ADR-004-tier-a-p2p-vs-tier-b-livekit.md)
- [LiveKit documentation](https://docs.livekit.io/)
