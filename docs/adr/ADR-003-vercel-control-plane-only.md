# ADR-003: Vercel is control-plane only — media never touches Vercel

- **Status:** Accepted
- **Date:** 2026-08-25
- **Phase:** 1 (Architecture, product contract and project foundation)

## Context

Vercel serverless/edge functions are stateless and time-boxed. They cannot hold
persistent connections, so they cannot host a signaling WebSocket, an SFU, or a
TURN relay. Meanwhile Vercel's bandwidth allowance applies to *app* traffic —
raw audio/video bytes flowing through functions would blow the free tier and
degrade calls.

## Decision

Vercel hosts **application and control-plane responsibilities only**:

- Pages, Route Handlers and Server Actions (auth, room CRUD, token minting,
  webhook receivers)
- Database access (Neon Postgres via Prisma)
- Realtime coordination over HTTP-based pub/sub (Upstash Redis REST + SSE)

**Raw media never passes through Vercel.** In Tier A it flows directly between
peers (WebRTC P2P mesh); in Tier B it flows between browsers and the LiveKit
server (SFU + TURN). Vercel only issues short-lived join tokens and coordinates
state.

Signaling for Tier A works within this constraint because Upstash's HTTP-based
pub/sub is designed for serverless: clients subscribe over SSE; offers, answers
and ICE candidates are relayed as Redis messages — no persistent server-side
connection required.

## Consequences

- No feature may route audio/video bytes through a Next.js route or Server
  Action.
- TURN/SFU capacity lives outside Vercel (LiveKit self-hosted or LiveKit Cloud)
  when Tier B lands.
- Free-tier math stays predictable: app traffic scales with usage of the UI,
  not with call duration or participant count.
