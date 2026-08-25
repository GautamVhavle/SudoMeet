# SudoMeet Architecture

This document describes the system design, key abstractions, and architectural
decisions behind SudoMeet.

## Overview

SudoMeet is a dark-mode-first video collaboration platform for developer teams,
built as an open-source alternative to Google Meet. It supports **Tier A** (P2P
mesh calls for ~4 people) and **Tier B** (LiveKit SFU for larger meetings),
both running through the same media-provider abstraction.

### Design Principles

1. **Media-provider abstraction**: UI never couples to `simple-peer` or
   `livekit-client` directly; all media flows through `lib/media/provider.ts`.
2. **Vercel is control-plane only**: Media streams (audio/video) never pass
   through Vercel — they flow peer-to-peer (Tier A) or via LiveKit SFU (Tier B).
3. **Free-tier friendly**: Default deployment runs on Vercel (Hobby), Neon
   (Free), Upstash (Free), LiveKit (Community).
4. **Dark-mode-first**: Designed primarily for dark mode; light mode is
   secondary.
5. **Type-safe end to end**: Strict TypeScript, zod validation at boundaries,
   branded types for domain primitives.
6. **Server Components by default**: Next.js App Router with RSC for data
   fetching; Client Components only for interactivity.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │ Next.js UI │──│ Call Store │──│ Media Provider API  │   │
│  │ (React 19) │  │  (Zustand) │  │   (abstraction)     │   │
│  └────────────┘  └────────────┘  └──────────┬──────────┘   │
│                                              │              │
│                        ┌─────────────────────┼─────────┐    │
│                        ▼                     ▼         │    │
│              ┌──────────────────┐  ┌──────────────┐   │    │
│              │ P2P Provider     │  │ LiveKit      │   │    │
│              │ (simple-peer)    │  │ Provider     │   │    │
│              └────────┬─────────┘  └──────┬───────┘   │    │
│                       │                   │           │    │
└───────────────────────┼───────────────────┼───────────┘    │
                        │                   │                │
        ┌───────────────┼───────────────────┼────────────────┘
        │               │                   │
        ▼               ▼                   ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────────┐
│   Vercel     │  │  Upstash    │  │  LiveKit Cloud   │
│  (Control    │  │   Redis     │  │   or Self-host   │
│   Plane)     │  │ (Signaling) │  │   (SFU Media)    │
│              │  │             │  │                  │
│ - App Routes │  │ - Presence  │  │ - WebRTC relay   │
│ - API Routes │  │ - Chat      │  │ - Recording      │
│ - Auth       │  │ - Signaling │  │ - Broadcast      │
│ - Database   │  │   (SSE)     │  │                  │
└──────┬───────┘  └─────────────┘  └──────────────────┘
       │
       ▼
┌──────────────────────┐
│   Neon Postgres      │
│  - Meetings          │
│  - Sessions          │
│  - Users / Guests    │
│  - API Keys          │
│  - Webhooks          │
└──────────────────────┘
```

## Core Abstractions

### 1. Media Provider Interface

**Location**: `lib/media/types.ts`, `lib/media/provider.ts`

All media operations (joining, publishing streams, subscribing to peers, chat,
screen share, reactions) go through a unified `MediaProvider` interface:

```ts
interface MediaProvider {
  join(config: JoinConfig): Promise<void>;
  publish(stream: MediaStream): Promise<void>;
  unpublish(): Promise<void>;
  subscribe(peerId: string): Promise<void>;
  // ... chat, screenshare, etc.
}
```

Two implementations:

- **`P2PProvider`** (`lib/media/p2p-provider.ts`): WebRTC mesh via
  `simple-peer`, signaling over Upstash Redis pub/sub via SSE
  (`/api/signal/sse`).
- **`LiveKitProvider`** (`lib/media/livekit-provider.ts`): LiveKit SFU client.

The UI code in `features/call/*` and `hooks/use-*` never imports `simple-peer`
or `livekit-client` — only the provider interface. This allows swapping Tier A
↔ Tier B without rewriting the UI.

### 2. Tier A (P2P) vs Tier B (LiveKit)

| Aspect                 | Tier A (P2P)                          | Tier B (LiveKit)         |
| ---------------------- | ------------------------------------- | ------------------------ |
| **Media topology**     | Mesh (every peer connects to every other) | SFU (centralized relay) |
| **Max participants**   | ~4 (bandwidth/CPU limited)           | ~100+                    |
| **Signaling**          | Upstash Redis pub/sub → SSE          | LiveKit signaling        |
| **Media path**         | Peer-to-peer (never touches Vercel)  | Via LiveKit cloud/on-prem |
| **Recording**          | Client-side only (MediaRecorder API) | Server-side via LiveKit egress |
| **Infrastructure cost**| Free tier (Redis pub/sub)            | LiveKit Community or paid plan |

The `Meeting.mediaProvider` field (`"P2P" | "LIVEKIT"`) determines which
provider is instantiated.

### 3. Signaling Flow (Tier A)

For P2P calls, signaling messages (SDP offers/answers, ICE candidates) are
relayed via Upstash Redis:

1. Peer A joins room → subscribes to `signal:<roomCode>` channel via SSE
   (`GET /api/signal/sse?roomCode=xyz`)
2. Peer A publishes local stream → sends offer to `signal:<roomCode>` Redis
   channel via `POST /api/signal`
3. Peer B (already subscribed) receives offer over SSE, sends answer back
4. ICE candidates flow bidirectionally
5. WebRTC connection established directly (STUN servers negotiate NAT traversal)
6. Media flows peer-to-peer (audio/video never touches Vercel or Redis)

**Presence** is tracked separately in `presence:<roomCode>` Redis keys (30s
TTL, refreshed via `POST /api/presence/heartbeat`).

### 4. Database Schema (Prisma)

**Key models** (see `prisma/schema.prisma`):

- **User**: Authenticated users (GitHub OAuth or magic links via Auth.js)
- **Session**: Auth.js database sessions
- **Meeting**: A meeting room (roomCode, title, mediaProvider, maxParticipants,
  hostId, createdById)
- **MeetingSession**: A meeting's runtime session (join/leave timestamps, Tier
  A presence, Tier B LiveKit room)
- **Participant**: User or guest participation in a meeting
- **ChatMessage**: Chat messages in a meeting
- **Recording**: Recorded meetings (currently client-side only for Tier A;
  server-side via LiveKit for Tier B)
- **APIKey**: Developer platform API keys (`sudomeet_live_*` prefix, SHA-256
  hashed)
- **WebhookEndpoint**: Registered webhook URLs for event delivery

**Migrations**: Managed via Prisma Migrate (`npm run db:migrate` dev, `npm run
db:deploy` production).

### 5. Authentication & Authorization

**Auth.js v5** (`next-auth@beta`) with Prisma adapter and database sessions:

- **Session strategy**: Database (required by Prisma adapter), 30-day maxAge
- **Providers**:
  - GitHub OAuth (conditional — activates when `AUTH_GITHUB_ID` is set)
  - Magic links (email provider, logs URL to terminal in dev, uses SMTP in
    production)
- **Guest identity**: Unauthenticated users can submit a display name to
  `POST /api/auth/guest` → receive a transient `GuestIdentity` (cookie-based,
  no database row)

**Permissions** (`lib/auth/permissions.ts`):

- Pure functions, no DB lookups (all context passed in)
- `canJoinMeeting`, `canStartRecording`, `canManageAPIKeys`, etc.
- Host status derived from `meeting.hostId === session.user.id`

**Rate limiting**: In-memory `RateLimiter` (Phase 3) for auth endpoints
(`/api/auth/guest`, magic-link send). For production at scale, replace with
Redis-backed limiter.

### 6. Developer Platform (Phase 13)

**Public API** (`/api/v1/*`):

- `POST /api/v1/meetings` — Create meeting programmatically
- `GET /api/v1/meetings/:id` — Retrieve meeting details
- Authenticated via API keys in `Authorization: Bearer sudomeet_live_*` header

**API Keys**:

- Generated at `/settings/api-keys` (UI)
- `POST /api/keys` → returns plaintext key ONCE, then stores SHA-256 hash
- Prefix `sudomeet_live_` for live keys, `sudomeet_test_` for test mode
  (test mode not yet implemented)
- Verified in middleware via timing-safe comparison

**Webhooks**:

- Register endpoints at `/settings/webhooks` (UI) or `POST /api/webhooks`
- Events: `meeting.started`, `meeting.ended`, `participant.joined`,
  `participant.left`, `recording.started`, `recording.completed`
- Payloads signed with HMAC-SHA256 (`X-SudoMeet-Signature` header)
- Delivery retry: 3 attempts with exponential backoff (Phase 13 basic
  implementation; production would use a queue)

**CLI** (`packages/cli`):

- `npx sudomeet login` — Authenticate with API key
- `npx sudomeet meetings create` — Create meeting
- `npx sudomeet meetings list` — List meetings
- Configuration stored in `~/.sudomeet/config.json`

**Embed widget** (`/embed/[roomCode]`):

- Iframe-embeddable meeting join UI
- Minimal chrome (no dashboard, just the call UI)
- CORS headers allow embedding from any origin (configurable via env)

### 7. Testing Strategy (Phase 14)

- **Unit tests** (`tests/unit/*.test.ts`): Pure functions, validation schemas,
  permissions, API key generation. Run via `npm run test` (104 tests).
- **Integration tests** (`tests/integration/*.test.ts`): API routes, database
  operations, webhook delivery.
- **E2E tests** (`tests/e2e/*.spec.ts`): Playwright scenarios (login, create
  meeting, join call, chat, screen share). Run via `npm run test:e2e`.

All tests run in CI on every PR.

### 8. Observability (Phase 14)

**Status endpoint** (`GET /api/status`):

```json
{
  "status": "healthy",
  "timestamp": "2026-08-25T10:00:00Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "livekit": "healthy"
  }
}
```

**Structured logging**: Phase 14 added `lib/observability/logger.ts` (simple
console wrapper; can be extended with Pino/Winston for production).

**Performance**: Next.js built-in metrics (Web Vitals), Vercel Analytics
integration optional.

## Data Flow Examples

### Creating a Meeting

```
User (Browser)
  │
  ▼
Dashboard page (RSC)
  │
  └──> Server Action: createMeeting(formData)
         │
         ├──> requireUser() → session from Auth.js
         ├──> zod.parse(formData)
         ├──> prisma.meeting.create(...)
         └──> revalidatePath('/dashboard')
                │
                ▼
              Database (Neon)
```

### Joining a Tier A (P2P) Call

```
1. User navigates to /m/[roomCode]
   ├──> RSC fetches meeting from DB
   └──> Renders lobby (client component)

2. User clicks "Join"
   ├──> Client: POST /api/presence/join {roomCode, displayName}
   │      └──> Server: upsert participant, return config
   ├──> Client: mediaProvider.join(config)
   │      └──> P2PProvider:
   │            ├──> GET /api/signal/sse?roomCode=xyz (SSE stream)
   │            ├──> getUserMedia() → localStream
   │            └──> For each peer in room:
   │                   └──> new SimplePeer({initiator}) → sendOffer()
   │                          └──> POST /api/signal {offer}
   │                                 └──> Redis PUBLISH signal:xyz
   │
   └──> Other peers receive offer over SSE → send answer
          └──> WebRTC connection established (P2P media path)
```

### Switching to Tier B (LiveKit)

Same UI code, but:

1. `Meeting.mediaProvider = "LIVEKIT"`
2. `mediaProvider.join(config)` → `LiveKitProvider.join()`
   - Calls `POST /api/livekit/token` → LiveKit JWT
   - Connects to LiveKit cloud via `livekit-client`
   - Media flows via SFU (no P2P mesh)

The call UI (`features/call/*`) is unchanged.

## Deployment Architecture

### Vercel (Control Plane)

- Hosts Next.js app (App Router)
- API routes for auth, meetings, signaling relay, LiveKit token generation
- Database queries (Prisma → Neon)
- Redis operations (Upstash)
- **Media NEVER passes through Vercel functions** (ADR-003)

### Neon (Database)

- Serverless Postgres with connection pooling
- `DATABASE_URL` → pooled connection (via `-pooler` host)
- `DIRECT_DATABASE_URL` → direct connection for migrations

### Upstash (Redis)

- Pub/sub for signaling (Tier A)
- Presence tracking (Tier A)
- Chat message relay (Tier A)
- SSE endpoint streams from Redis subscriptions (`GET /api/signal/sse`)

### LiveKit (Tier B Media)

- SFU media server (WebRTC relay)
- Server-side recording via egress
- Can run on LiveKit Cloud (community plan free) or self-hosted

### Cloudflare R2 (Recordings)

- S3-compatible storage for recorded meetings
- Pre-signed URLs for downloads (short-lived tokens)

## Environment Variables

See [.env.example](.env.example) for the full list. Key variables:

| Variable                | Required in | Purpose                             |
| ----------------------- | ----------- | ----------------------------------- |
| `NEXT_PUBLIC_APP_URL`   | Phase 1     | Canonical public origin             |
| `DATABASE_URL`          | Phase 2     | Neon pooled connection              |
| `DIRECT_DATABASE_URL`   | Phase 2     | Neon direct (for migrations)        |
| `AUTH_SECRET`           | Phase 3     | Auth.js session encryption          |
| `AUTH_GITHUB_ID`        | Phase 3     | GitHub OAuth (optional)             |
| `AUTH_GITHUB_SECRET`    | Phase 3     | GitHub OAuth (optional)             |
| `UPSTASH_REDIS_REST_*`  | Phase 7     | Tier A signaling/presence           |
| `LIVEKIT_*`             | Phase 11    | Tier B SFU media                    |
| `R2_*`                  | Phase 12    | Recording storage                   |

Variables are validated at build/startup via `lib/env.ts` (zod schemas, fail-fast).

## Architecture Decision Records (ADRs)

Detailed decisions are documented in [docs/adr/](docs/adr/):

1. [ADR-001 — Media-provider abstraction](docs/adr/ADR-001-media-provider-abstraction.md)
2. [ADR-002 — Dark-mode-first design](docs/adr/ADR-002-dark-mode-first-design.md)
3. [ADR-003 — Vercel is control-plane only](docs/adr/ADR-003-vercel-control-plane-only.md)
4. [ADR-004 — Tier A P2P vs Tier B LiveKit split](docs/adr/ADR-004-tier-a-p2p-vs-tier-b-livekit.md)

## Known Limitations (as of Phase 15)

- **Rate limiting**: In-memory only (resets on deploy); production needs
  Redis-backed limiter
- **Webhook delivery**: Basic retry logic; production should use a queue (BullMQ,
  Inngest, etc.)
- **Tier A participant limit**: Mesh topology degrades beyond ~4 people (N²
  connections)
- **Recordings**: Client-side only for Tier A (uses MediaRecorder API); server-side
  via LiveKit for Tier B
- **TURN servers**: Not configured by default (required for restrictive
  firewalls); users must add their own STUN/TURN servers

See [docs/security-checklist.md](docs/security-checklist.md) for the full Phase
14 security audit.

## Scaling Considerations

### Horizontal Scaling

- **Vercel functions**: Auto-scale (Hobby plan has limits; upgrade to Pro for
  production traffic)
- **Neon**: Connection pooling handles concurrent requests; autoscaling enabled
  by default
- **Upstash Redis**: Free tier supports 10K commands/day; upgrade to Pro for
  high-volume signaling

### Vertical Scaling

- **Tier A → Tier B**: Switch meetings to `mediaProvider: "LIVEKIT"` when >4
  participants expected
- **LiveKit**: Self-host for full control, or use LiveKit Cloud with higher
  participant limits

### Data Retention

- **Sessions**: Cleaned up by Auth.js (expired sessions removed on next login)
- **Meetings**: No auto-deletion; implement a cron job to archive old meetings
- **Recordings**: Stored indefinitely in R2; implement lifecycle policies for
  cost control

## Future Work

- **Virtual backgrounds / noise suppression**: Via `@mediapipe/tasks-vision`
  or similar
- **Breakout rooms**: Already prototyped in Phase 10 (stores + UI), needs
  backend wiring
- **Calendar integration**: Sync meetings with Google Calendar / Outlook
- **Slack/Discord bots**: Create meetings via slash commands
- **TURN server pool**: Rotate TURN credentials, distribute load
- **Analytics**: Track meeting duration, participant counts, quality metrics

## References

- [Implementation Plan](implementation-plan.md) — Full 15-phase execution plan
- [Product Vision](plan.md) — Original product spec
- [Developer Platform Docs](docs/developer-platform.md) — API, webhooks, CLI, embed
- [Security Checklist](docs/security-checklist.md) — Phase 14 hardening results

---

For questions or clarifications, open an issue or discussion on GitHub.
