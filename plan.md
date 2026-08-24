# SudoMeet — Build Plan for an Open-Source, Vercel-Hosted Video Calling Platform

A developer-focused, dark-mode-first alternative to Google Meet — buildable for $0 using Next.js and open-source infrastructure.

---

## 0. Read this first — the one honest constraint that shapes everything

Before the fun part, one architectural fact has to be on the table, because it decides your whole stack:

> **Vercel serverless/edge functions cannot hold a persistent connection.** Every function invocation is stateless and time-boxed (roughly 10–60s depending on plan/runtime, higher with Fluid Compute, but never "forever"). A real signaling server, a media relay (SFU), and a TURN server are all things that need to sit there and keep a connection open 24/7 — which is exactly what serverless can't do.

This means three specific Google Meet capabilities cannot be built as "just a Vercel function":

| Capability | Why serverless alone can't do it | What actually works |
|---|---|---|
| **Signaling** (exchanging WebRTC offers/answers/ICE candidates) | No persistent WebSocket on Vercel | ✅ Solvable on Vercel using **Server-Sent Events + Redis pub/sub** (Upstash) — this genuinely works, see §6 |
| **TURN relay** (needed so calls work behind strict NATs/firewalls — roughly 15-20% of real-world users need this) | TURN is a long-lived UDP/TCP relay process, not a request/response function | ❌ Not possible on Vercel itself. Needs a small always-on process elsewhere |
| **Multi-party media routing (SFU)** — the thing that lets 10 people see each other without everyone uploading their video 9 times | Same reason — it's a stateful media server, not a function | ❌ Not possible on Vercel itself. Needs a dedicated media server |

**The honest options for TURN + SFU, ranked by how well they fit "free, minimal ops":**

1. **LiveKit** (Apache-2.0, fully open source, self-hostable) — it bundles SFU *and* TURN in one open-source binary. You either:
   - Run it yourself on a free-tier VM (Oracle Cloud Always Free, Fly.io free allowance) — 100% open source, zero vendor lock-in, but it's a real server you maintain — the one piece of this project that isn't "on Vercel.", or
   - Use **LiveKit Cloud's free tier** (their infra, not yours) — zero ops, but it's a third-party managed service, not open-source-self-hosted.
2. Roll your own SFU with **mediasoup** (also open source) — more control, dramatically more work (you're writing a C++/Node media server from scratch). Not recommended for a first build.
3. Skip the SFU entirely and do **pure P2P mesh** for calls of ≤4 people. This *is* 100%-Vercel-only-plus-Redis and needs no external server at all — but it isn't "all the features of Google Meet," it's a FaceTime-style small-group app, and quality degrades fast past 3-4 tiles because every participant uploads their video once per peer.

**My recommendation:** build it in two tiers, and be upfront with yourself about which tier you're in at any time:

- **Tier A (pure Vercel + Upstash + Neon, genuinely zero external servers):** auth, dashboard, chat, presence, reactions, scheduling, 1:1 and small-group (≤4) P2P calls with screen share. This is a complete, real product on its own.
- **Tier B (adds LiveKit):** unlocks true Meet-scale rooms (dozens of tiles), reliable NAT traversal for everyone, server-side recording, spotlight/pin that doesn't choke a presenter's upload bandwidth, and breakout rooms. This is one extra open-source component, not a rewrite — Tier A's UI and data model carry over unchanged.

Everything below is written so you can ship Tier A first and drop LiveKit in later without throwing anything away.

---

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App (Vercel)                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  Marketing │  │ Dashboard │  │  Pre-join  │  │  Call Room   │  │
│  │  / Home    │  │  (rooms,  │  │  Lobby     │  │  UI (tiles,  │  │
│  │            │  │  history) │  │  (device   │  │  chat, ctrl  │  │
│  │            │  │            │  │  check)    │  │  bar)        │  │
│  └───────────┘  └───────────┘  └───────────┘  └──────────────┘  │
│         Route Handlers / Server Actions (auth, room CRUD,        │
│         LiveKit token minting, webhook receivers)                │
└──────────┬───────────────┬────────────────────┬─────────────────┘
           │                │                    │
           ▼                ▼                    ▼
   ┌───────────────┐ ┌──────────────┐   ┌──────────────────────┐
   │ Neon Postgres  │ │ Upstash Redis │   │ LiveKit (self-hosted  │
   │ (via Prisma)   │ │ (pub/sub, SSE │   │ on free VM, or        │
   │ users, rooms,  │ │ presence,     │   │ LiveKit Cloud free    │
   │ meetings, chat │ │ signaling     │   │ tier) — SFU + TURN +  │
   │ history        │ │ relay)        │   │ recording (egress)    │
   └───────────────┘ └──────────────┘   └──────────────────────┘
```

Browsers talk WebRTC media directly to LiveKit (or to each other for Tier-A P2P); Vercel never touches raw audio/video bytes — it only issues short-lived join tokens and coordinates state. This is important for the free-tier math: Vercel's bandwidth cap is for *your app's* traffic, not for the media stream, which flows peer-to-peer or through LiveKit's own network instead.

---

## 2. Tech stack

### Frontend
| Purpose | Library | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Server Actions + Route Handlers give you a "backend" without a separate server |
| Styling | **Tailwind CSS** | Utility-first, trivial to keep a strict dark-mode design system |
| Components | **shadcn/ui** (on top of Radix primitives) | You own the code, not a black-box dependency — ideal for a "cleanest UI possible" goal |
| Icons | **lucide-react** | Consistent, open-source, matches shadcn |
| Animation | **Motion** (formerly Framer Motion) | Tile transitions, panel slide-ins |
| State | **Zustand** | Lightweight, no boilerplate for call state (mic on/off, layout mode, pinned tile) |
| Data fetching/cache | **TanStack Query** | Dashboard lists, meeting history |
| Forms/validation | **react-hook-form + zod** | Room settings, profile forms |
| Layout | **react-resizable-panels** | Draggable split between video grid and chat/side panel |
| Command palette | **cmdk** | Developer-focused nicety: `⌘K` to jump rooms, mute, toggle layout |
| Toasts | **sonner** | Join/leave, connection-quality notices |
| Panels/sheets | **Vaul** | Mobile-friendly bottom sheets for chat/participants on small screens |

### Realtime & media
| Purpose | Library/service | Free-tier notes |
|---|---|---|
| Signaling transport | **Upstash Redis** + **@upstash/realtime** | Purpose-built for exactly this: HTTP-based pub/sub over SSE, designed to run on Vercel functions. Free tier is generous for dev/small prod use |
| Media engine (Tier A) | **simple-peer** (thin wrapper over native WebRTC) | For P2P mesh calls, no server needed beyond signaling |
| Media engine (Tier B) | **livekit-client** + **livekit-server-sdk** | Client SDK talks to your LiveKit server; server SDK mints join tokens and manages rooms from your Route Handlers |
| Recording | **LiveKit Egress** (part of LiveKit OSS) | Writes to any S3-compatible bucket — pair with **Cloudflare R2** (10GB free) or Vercel Blob for small clips |
| On-device background blur/virtual bg | **@mediapipe/tasks-vision** (Google's open-source, runs fully client-side) | No server cost — it's all WASM in the browser |
| Live captions (optional, Tier A-friendly) | **@ricky0123/vad-web** + **transformers.js** (Whisper small, runs client-side in WASM) | Genuinely free/serverless, but quality/perf trade-offs vs a real cloud STT API — flag this as "good enough for a dev tool," not production Meet-quality |

### Backend / data
| Purpose | Service | Free-tier notes |
|---|---|---|
| Database | **Neon** (serverless Postgres, via Vercel Marketplace) | Vercel no longer ships its own Postgres/KV — Neon, Upstash, and Supabase are the current first-party-integrated marketplace options. Neon's free tier is the standard pick for a Prisma + Next.js app |
| ORM | **Prisma** | Type-safe schema, migrations, works cleanly with Neon's pooled connection string |
| Auth | **Auth.js (NextAuth v5)** | Fully open source, self-hosted, no per-MAU fee (unlike some hosted auth providers) — pairs with the Prisma adapter |
| File storage (avatars, small assets) | **Vercel Blob** | 1GB free; fine for avatars/thumbnails, not for long recordings — use R2 for those |
| Background/scheduled jobs (e.g., auto-expire rooms, cleanup) | **Vercel Cron** + **QStash** (Upstash) | Cron for simple schedules; QStash if you need retryable/delayed jobs (e.g., "send recording-ready notification") |

### Dev tooling
- **TypeScript** everywhere, `zod`-validated `env.ts` so a missing env var fails at build, not at 2am in a call.
- **ESLint + Prettier**, husky pre-commit.
- **Playwright** for e2e (at minimum: can two browser contexts join the same room and see each other's tile render).
- **Turborepo** only if you split into `apps/web` + `packages/ui` — optional for a solo project, worth it if you build the embeddable SDK mentioned in §3.

---

## 3. Feature set — Meet parity, organized by build tier, with a developer-focused lens

### Homepage / marketing
- Minimal dark hero, "Start a call" / "Join with code" as the two primary CTAs (mirrors Meet's actual homepage IA).
- Live status widget showing your own infra (nice dev-tool touch: "Signaling: ● healthy", "Media: ● healthy" pulling from a `/api/status` health check).

### Auth & dashboard
- Sign in (email magic link + GitHub OAuth — GitHub login is the obvious choice for a dev-facing tool).
- Dashboard: upcoming/instant meetings, meeting history with duration + participant count, personal meeting room (a stable, reusable room code like Meet's "nickname" links).
- **Dev-specific:** an API-keys page — let a signed-in user generate a key to create rooms and mint join tokens programmatically (see "Dev extras" below).

### Pre-join lobby
- Camera/mic device picker, live preview tile, mic level meter.
- Background blur / virtual background (client-side, MediaPipe).
- "Join now" vs "Ask to join" (host approval) toggle if the room is locked.
- Network quality pre-check (basic `RTCPeerConnection` stats probe against a STUN server) before letting them in — a nice, honest "your connection looks weak" warning instead of Meet's silence on this.

### In-call core
- **Layouts:** Grid (auto-tiling), Spotlight (one large tile), Sidebar (spotlight + filmstrip) — implement as a pure client-side layout engine reacting to participant count and pinned/active-speaker state.
- **Pin / spotlight for everyone:** host action broadcast over the signaling channel; in LiveKit this maps to their native active-speaker + `setSubscribed` track prioritization, which also saves bandwidth (viewers don't pull full-res video for tiles they're not looking at).
- **Screen share:** tab/window/full-screen picker (native `getDisplayMedia`), optional system-audio capture, "you are presenting" banner, presenter's screen auto-pinned for everyone.
- **Reactions & raise hand:** ephemeral events over the Redis pub/sub channel — no DB write needed, just fire-and-forget broadcast + a floating emoji animation.
- **Chat:** persistent per-meeting, Markdown rendering **with code-block + syntax highlighting** (Shiki) — this is your clearest "built for developers" differentiator versus Meet's plain-text chat. Store in Postgres, stream new messages via the same Redis/SSE channel as signaling.
- **Participants panel:** list, mute-others (host), remove participant (host), "pin this person" per-viewer (local only, doesn't affect others).
- **Control bar:** mic/cam/screen-share/reactions/leave, plus a **stats overlay toggle** (dev extra — see below).

### Tier B additions (once LiveKit is in place)
- Real multi-party rooms (10s of participants) without every browser uploading N video streams.
- **Recording:** start/stop via LiveKit Egress, stored to R2, listed in the dashboard with a signed playback URL.
- **Breakout rooms:** host splits participants into sub-rooms (LiveKit supports moving participants between rooms server-side); simple timer + "return everyone" action.
- **Live captions:** swap the client-side Whisper approach for LiveKit's server-side transcription pipeline if/when you want production-grade accuracy (this is the one place where "completely free" starts trading off against "actually good captions" — worth flagging to yourself now rather than discovering it later).

### Developer-focused extras (the actual differentiation from Meet)
- **Meetings-as-code:** `POST /api/meetings` with an API key creates a room and returns a join URL — so a CI pipeline, a bot, or a CLI (`npx sudomeet start`) can spin up a call without touching the UI.
- **Webhooks:** emit `meeting.started`, `participant.joined`, `recording.ready` events to a URL the user registers — mirrors how Stripe/LiveKit itself do webhooks, and it's a genuinely useful feature (e.g., auto-post to Slack when standup starts).
- **In-call WebRTC stats overlay:** a togglable panel showing per-peer bitrate, packet loss, jitter, round-trip time, and (Tier B) which SFU node you're connected to. Real debugging value, and visually it's very "built by developers, for developers."
- **Embeddable call widget:** a small `<script>`/iframe SDK so someone can drop a SudoMeet room into their own app — reuses the same room/token API.
- **Keyboard-first UI:** `⌘K` command palette for every action (mute, share screen, switch layout, jump to room), full keyboard shortcuts shown as a `?`-triggered cheat sheet — Linear/Vercel-style, not Meet's mouse-only interaction model.

---

## 4. Route / information architecture (Next.js App Router)

```
app/
├─ (marketing)/
│  ├─ page.tsx                     → landing page
│  └─ pricing/ (optional, if you ever add paid tiers)
├─ (auth)/
│  ├─ login/page.tsx
├─ (app)/
│  ├─ dashboard/page.tsx           → meeting list, "new meeting"
│  ├─ settings/page.tsx            → devices, API keys, profile
│  └─ settings/api-keys/page.tsx
├─ m/[roomId]/
│  ├─ page.tsx                     → pre-join lobby
│  └─ call/page.tsx                → the actual call UI (separate route so
│                                      refresh doesn't re-run device checks)
├─ api/
│  ├─ auth/[...nextauth]/route.ts
│  ├─ meetings/route.ts            → POST create, GET list
│  ├─ meetings/[id]/route.ts       → GET/PATCH/DELETE single meeting
│  ├─ livekit/token/route.ts       → mint short-lived join token
│  ├─ signal/route.ts              → SSE stream (Tier A P2P signaling)
│  ├─ signal/send/route.ts         → publish an offer/answer/ICE candidate
│  ├─ chat/[roomId]/route.ts       → SSE stream + POST new message
│  ├─ webhooks/livekit/route.ts    → receive LiveKit egress/room events
│  └─ status/route.ts              → health check for the homepage widget
```

---

## 5. Data model (Prisma sketch)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  apiKeys       ApiKey[]
  meetingsHosted Meeting[] @relation("HostedMeetings")
  participations Participant[]
  createdAt     DateTime  @default(now())
}

model Meeting {
  id            String    @id @default(cuid())
  roomCode      String    @unique   // human-friendly join code
  title         String?
  hostId        String
  host          User      @relation("HostedMeetings", fields: [hostId], references: [id])
  isLocked      Boolean   @default(false)   // requires host approval to join
  startedAt     DateTime?
  endedAt       DateTime?
  participants  Participant[]
  messages      ChatMessage[]
  recordings    Recording[]
  createdAt     DateTime  @default(now())
}

model Participant {
  id          String   @id @default(cuid())
  meetingId   String
  meeting     Meeting  @relation(fields: [meetingId], references: [id])
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  displayName String
  joinedAt    DateTime @default(now())
  leftAt      DateTime?
}

model ChatMessage {
  id         String   @id @default(cuid())
  meetingId  String
  meeting    Meeting  @relation(fields: [meetingId], references: [id])
  senderName String
  body       String
  isCode     Boolean  @default(false)
  createdAt  DateTime @default(now())
}

model Recording {
  id         String   @id @default(cuid())
  meetingId  String
  meeting    Meeting  @relation(fields: [meetingId], references: [id])
  storageUrl String
  durationS  Int?
  createdAt  DateTime @default(now())
}

model ApiKey {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  hashedKey String   @unique
  label     String?
  createdAt DateTime @default(now())
}
```

---

## 6. How signaling actually works on pure Vercel (Tier A)

This is the part most people give up on, so here's the concrete flow:

1. Client opens an `EventSource` to `GET /api/signal?room=xyz` — a Route Handler on the **Edge runtime**, streaming Server-Sent Events. It subscribes to an Upstash Redis channel named after the room.
2. When Client A wants to call Client B, it `POST`s its WebRTC offer to `/api/signal/send`, which does `redis.publish("room:xyz", offer)`.
3. Every open SSE stream on that room receives the message and forwards it down to its browser instantly (`@upstash/realtime` handles the plumbing here).
4. Client B's browser answers, sends its own answer + ICE candidates back the same way.
5. Once ICE negotiation completes, **media flows directly between browsers** (or, in Tier B, between each browser and the LiveKit SFU) — Redis and Vercel are never in the media path, only the handshake.

Two things worth knowing going in: Vercel's own SSE responses have a timeout (well under an hour, often cited around 25s-ish on plain serverless, longer on Fluid Compute) — so the client needs auto-reconnect logic with a `Last-Event-ID`-style resume, which `@upstash/realtime` is built to handle. And this whole flow is genuinely production-viable for signaling — it's exactly the pattern Upstash publishes as their reference architecture for realtime-on-Vercel.

---

## 7. UI/UX direction

- **Dark mode only at first** (skip the light-mode toggle entirely for v1 — one design system, not two, and it matches the "developer tool" identity — VS Code, Linear, Vercel's own dashboard are all dark-first).
- Base your shadcn theme on a near-black background (`zinc-950`/`neutral-950`) with a single accent color (pick one — electric blue or violet reads "developer tool"; avoid Meet's blue-and-white corporate palette entirely so it doesn't look like a clone).
- Generous rounded corners on tiles (`rounded-xl`), soft shadows only on the active-speaker tile, not everywhere — restraint is what makes UI read as "clean" rather than "empty."
- Control bar: floating, centered, auto-hides after a few seconds of no mouse movement (Meet does this too, but make the reveal edge larger so it doesn't feel twitchy).
- Motion: tile reflow on participant join/leave should animate position (Motion's `layout` prop handles this in one line) — this single detail does more for "polished" than almost anything else.
- Typography: a monospace accent font (e.g., **JetBrains Mono** or **Geist Mono**) for room codes, API keys, and the stats overlay — reinforces the dev-tool feel without overusing it.

---

## 8. Build roadmap

| Phase | Scope | Outcome |
|---|---|---|
| **0. Scaffold** | Next.js + Tailwind + shadcn init, Neon + Prisma wired, Auth.js login working | You can sign in and see an empty dashboard |
| **1. Rooms & dashboard** | Create/list/join meetings by code, Prisma models live | Dashboard is functional, no video yet |
| **2. Tier A calling (P2P)** | Lobby, device preview, `simple-peer` + Upstash SSE signaling, basic grid layout, mic/cam/leave controls | Two people can have a real video call, 100% on Vercel + Upstash + Neon |
| **3. Chat & presence** | `@upstash/realtime` chat channel, reactions, participant list, raise hand | Call feels alive, not just video tiles |
| **4. Screen share, pin, layouts** | `getDisplayMedia`, spotlight/grid/sidebar layout engine, pin logic | Meet-parity for small calls |
| **5. LiveKit integration (Tier B)** | Stand up LiveKit (self-host on a free VM or LiveKit Cloud free tier), swap `simple-peer` for `livekit-client` behind a feature flag, token minting route | Real multi-party rooms, reliable NAT traversal |
| **6. Recording & breakout rooms** | LiveKit Egress → R2, breakout room API calls | Feature-complete against Meet's core set |
| **7. Dev extras** | API keys, meetings-as-code endpoint, webhooks, stats overlay, command palette | The actual differentiator vs. Meet ships |
| **8. Polish** | Empty states, error boundaries, connection-quality UI, Playwright e2e for join/leave/mute | Ready to actually hand to other people |

Ship Phases 0–4 first — that's a complete, demoable product entirely within the free-tier-only constraint, and it's the right point to decide whether Tier B is worth the one non-Vercel piece of infrastructure.

---

## 9. Free-tier deployment checklist

| Piece | Service | Cost |
|---|---|---|
| Hosting, functions, edge | Vercel Hobby | $0 (non-commercial use only — see note below) |
| Database | Neon free tier | $0 |
| Redis / pub-sub | Upstash free tier | $0 |
| Auth | Auth.js (self-hosted, no service) | $0 |
| Recordings storage | Cloudflare R2 free tier (10GB) | $0 |
| SFU + TURN (Tier B) | Self-hosted LiveKit on Oracle Cloud Always Free VM, **or** LiveKit Cloud free tier | $0, but self-hosting is the one part that isn't Vercel |
| Domain | Vercel's `.vercel.app` subdomain | $0 (skip a custom domain if you want to stay fully free) |

**Worth knowing before you launch it publicly:** Vercel's Hobby plan is explicitly for personal, non-commercial projects — if this ever turns into something with real users you're not comfortable calling "just a hobby project," that's the point you'd budget for Vercel Pro (~$20/mo). Doesn't affect anything about how you build it now, just don't be surprised by it later.

---

## 10. Known limitations, stated plainly

- **P2P-only (skip Tier B) caps out around 3-4 participants** before upload bandwidth on the presenter's connection becomes the bottleneck — this is WebRTC physics, not a bug you can fix in code.
- **Client-side captions (Whisper-in-WASM) will be noticeably behind Meet's server-side captions** in accuracy and latency — fine for a dev tool, not a claim to make to non-technical users.
- **Self-hosting LiveKit means you own that server's uptime** — it's the one piece of this stack with real ops burden (patching, monitoring, scaling past one VM). LiveKit Cloud's free tier removes that burden but is a third-party dependency.
- **"No TURN server" is not a viable end state** if you want this to work reliably off your own home wifi — budget for LiveKit (which bundles TURN) or a small `coturn` instance before calling this "production-ready."

---

This plan gets you a real, working video platform for $0 through Phase 4, and a genuinely Meet-comparable one once you add the single LiveKit component in Phase 5 — with every design decision on the table so you know exactly what you're trading off at each step.