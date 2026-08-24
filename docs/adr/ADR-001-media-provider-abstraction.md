# ADR-001: Media-provider abstraction

- **Status:** Accepted
- **Date:** 2026-08-25
- **Phase:** 1 (Architecture, product contract and project foundation)

## Context

SudoMeet ships in two tiers:

- **Tier A** — P2P mesh calls (~4 people) built on `simple-peer`, with signaling
  relayed over Upstash Redis pub/sub via SSE. No external media server.
- **Tier B** — LiveKit SFU for Meet-scale rooms, reliable NAT traversal
  (bundled TURN), server-side recording, spotlight/pin at scale.

The call UI (tiles, controls, chat, participants panel, layouts) must not be
rewritten when we move from Tier A to Tier B.

## Decision

All call UI code depends exclusively on a `MediaProvider` interface defined in
`lib/media/types.ts`:

```ts
interface MediaProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setMicrophoneEnabled(enabled: boolean): Promise<void>;
  setCameraEnabled(enabled: boolean): Promise<void>;
  startScreenShare(): Promise<void>;
  stopScreenShare(): Promise<void>;
  getParticipants(): CallParticipant[];
  onParticipantJoined(callback): void;
  onParticipantLeft(callback): void;
  onTrackChanged(callback): void;
}
```

Two implementations live beside it:

- `lib/media/p2p-provider.ts` — `P2PMediaProvider` (implemented in Phase 7)
- `lib/media/livekit-provider.ts` — `LiveKitMediaProvider` (implemented in Phase 11)

Neither `simple-peer` nor `livekit-client` may be imported outside `lib/media/`.
The call store (`stores/`) mediates between the UI and the active provider.

## Consequences

- The provider swap becomes a factory change, not a UI rewrite.
- Provider-specific capabilities must be expressed through the shared interface
  or explicit extension points; no leaking of engine types into components.
- Stub providers throw until their phase implements them, keeping the contract
  visible from day one.
