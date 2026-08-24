# SudoMeet

Dark-mode-first video collaboration for developer teams. P2P calls, screen
share, and chat — an open-source alternative to Google Meet that runs entirely
on free tiers.

- **Tier A** — P2P mesh calls (~4 people) via WebRTC with signaling relayed
  over Upstash Redis (SSE). Zero external media servers.
- **Tier B** — LiveKit SFU for Meet-scale rooms. Drops in later behind the same
  media-provider abstraction without rewriting the UI.

Media never passes through Vercel — it hosts the app and control plane only
(see [docs/adr](docs/adr)).

## Tech stack

- [Next.js 15](https://nextjs.org) (App Router) + React 19 + TypeScript strict
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [zod](https://zod.dev)-validated environment (`lib/env.ts`)
- ESLint + Prettier + Husky pre-commit (lint & typecheck)

## Getting started

### Prerequisites

- Node.js 20+ (22 recommended)
- npm 10+

### 1. Clone and install

```bash
git clone https://github.com/GautamVhavle/SudoMeet.git
cd SudoMeet
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in values. Only `NEXT_PUBLIC_APP_URL` is required
today; database/auth/Redis/LiveKit/R2 variables become required as their phases
land. `lib/env.ts` validates everything at build/startup and fails fast with a
readable error listing exactly what's missing.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                | What it does                 |
| ---------------------- | ---------------------------- |
| `npm run dev`          | Start dev server (Turbopack) |
| `npm run build`        | Production build             |
| `npm run start`        | Serve the production build   |
| `npm run lint`         | Run ESLint                   |
| `npm run typecheck`    | `tsc --noEmit`               |
| `npm run format`       | Format with Prettier         |
| `npm run format:check` | Check formatting             |

## Project structure

```text
app/          Next.js App Router routes
components/   Shared UI (shadcn/ui primitives live in components/ui)
features/     Feature modules: auth, meetings, call, chat, participants,
              developer-tools
lib/
  db/         Database client (Prisma — Phase 2)
  auth/       Auth.js configuration (Phase 3)
  redis/      Upstash Redis clients (pub/sub, presence, signaling)
  media/      MediaProvider abstraction + P2P / LiveKit implementations
  api/        API helpers (route handlers, server actions)
  validation/ Shared zod schemas
hooks/        Reusable React hooks
stores/       Zustand stores (call state, UI state)
types/        Shared TypeScript types
prisma/       Prisma schema and migrations (Phase 2)
tests/        unit / integration / e2e suites
docs/adr/     Architecture decision records
```

## Architecture decisions

Key decisions are recorded as ADRs:

1. [ADR-001 — Media-provider abstraction](docs/adr/ADR-001-media-provider-abstraction.md)
2. [ADR-002 — Dark-mode-first design](docs/adr/ADR-002-dark-mode-first-design.md)
3. [ADR-003 — Vercel is control-plane only](docs/adr/ADR-003-vercel-control-plane-only.md)
4. [ADR-004 — Tier A P2P vs Tier B LiveKit split](docs/adr/ADR-004-tier-a-p2p-vs-tier-b-livekit.md)

## Deployment

Production deploys to Vercel at **https://sudomeet-v1.vercel.app**. Set the
environment variables from `.env.example` in the Vercel project settings.

## License

MIT
