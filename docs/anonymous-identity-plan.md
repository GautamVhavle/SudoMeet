# Anonymous Identity Plan — No Sign-In

## Goal
Remove Sign In. Every visitor gets a stable anonymous identity via cookie + IP hash fallback. Same-home (same NAT IP) still yields distinct users. Refresh-persistent.

## Current State (Phases 1-15)
- Auth.js v5 + PrismaAdapter, DB sessions, GitHub OAuth + email-link
- `getSessionUserId()` / `requireUser()` guards on dashboard/settings/api routes
- `sudomeet_guest` cookie only for lobby
- Landing shows Sign In vs Dashboard based on session

## Why IP-only fails
- NAT collision: office/home = 1 IP = 1 identity
- IP rotation mid-call = identity loss
- No displayName persistence

## Design
1. **Identity = cookie primary + IP hash fallback**
   - `lib/identity/getOrCreateIdentity.ts` → `{ id, displayName, ipHash }`
   - Cookie `sudomeet_id=<uuid>` HttpOnly SameSite=Lax Max-Age 1yr Path=/
   - Cookie `sudomeet_name=<displayName>` (or encode in id cookie JSON)
   - `ipHash = sha256(x-forwarded-for + user-agent).slice(0,12)` — fallback only
   - Never redirects, never 401

2. **Refresh persistence**
   - Cookie survives refresh/tab close. Server reads via `cookies()` every RSC/Route Handler. `localStorage` mirrors displayName for instant UI.

3. **DB**
   - `User.isAnonymous Boolean @default(false)` — auto-create User row on first identity (id = uuid, name = Guest-xxxx)
   - Keep `Meeting.hostId` required (points to anonymous User) — no nullable migration needed. Alternative considered: nullable hostId — rejected to avoid cascade changes.

4. **Route changes**
   - Delete `app/login/*` (keep `lib/auth` dormant for now, not deleted to avoid breaking imports — will stub)
   - Replace `requireUser()`/`getSessionUserId()`/`auth()` with `getOrCreateIdentity()` in: `app/page.tsx`, `app/dashboard/*`, `app/settings/*`, `app/m/[roomCode]/page.tsx`, `app/api/meetings/*`, `app/api/chat/*`, `app/api/livekit/*`, `app/api/presence/*`, `app/api/signal/*`, `app/api/keys/*`, `app/api/webhooks/*`, `app/api/v1/*`
   - Landing CTA: Create meeting + Join by code directly

5. **Display name**
   - Auto `Guest-xxxx` (4-char base36 from uuid), editable inline, stored in cookie + localStorage, prompt once on first visit

6. **Same-home testing**
   - Each browser/device gets distinct `sudomeet_id` → 2 tabs same WiFi = 2 participants

## Implementation Steps
1. `lib/identity/*` + `lib/identity/ip.ts`
2. `prisma/schema.prisma` add `isAnonymous`, migrate
3. Patch all guards, delete login, update landing
4. `npm run typecheck && lint && test && build`, deploy

## Verification
- Two tabs same IP → distinct ids, both can join same room
- Refresh → same id retained
- No /login route, no Sign In UI
- All 104 tests pass (update mocks for new identity)
