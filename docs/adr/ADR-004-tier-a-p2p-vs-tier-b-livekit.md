# ADR-004: Tier A P2P vs Tier B LiveKit split

- **Status:** Accepted
- **Date:** 2026-08-25
- **Phase:** 1 (Architecture, product contract and project foundation)

## Context

SudoMeet must be buildable for $0 with minimal ops, yet eventually support
Meet-scale rooms. The two goals pull in different directions:

| | Tier A — P2P mesh | Tier B — LiveKit SFU |
|---|---|---|
| Media engine | `simple-peer` (native WebRTC) | `livekit-client` + LiveKit server |
| Room size | ~4 participants | Dozens of tiles |
| NAT traversal | Best-effort (STUN; no TURN on Vercel) | Reliable (bundled TURN) |
| Extra infra | None beyond Upstash Redis signaling | One always-on media server (self-hosted or LiveKit Cloud) |
| Recording | Not available | LiveKit Egress → S3-compatible (R2) |

## Decision

Ship **Tier A first** as a complete, real product: auth, dashboard, chat,
presence, scheduling, and 1:1 / small-group (≤4) P2P calls with screen share.
Add **Tier B later** as one extra open-source component — not a rewrite.

The seam between the tiers is the `MediaProvider` interface (ADR-001). Both
tiers share the same UI, meeting model, chat, participants panel, layouts and
dashboard; only the provider implementation changes.

## Consequences

- Every Phase ≤6 deliverable must be provider-agnostic by construction.
- Phase 7 implements `P2PMediaProvider`; Phase 11 implements
  `LiveKitMediaProvider` behind the same interface.
- Tier A's honest limits (~4 people, best-effort NAT traversal) are product
  constraints we accept and communicate, not bugs to patch.
- Data models must avoid encoding provider assumptions (e.g., never persist
  simple-peer signal payloads as part of the meeting schema).
