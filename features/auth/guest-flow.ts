import { randomUUID } from "node:crypto";

import { type GuestIdentity, parseGuestJoinRequest } from "@/lib/validation/auth";

/**
 * Guest flow decision logic (plan Phase 3):
 *
 *   User opens room → Authenticated?
 *     Yes → Join
 *     No  → Enter name → Lobby
 *
 * This module is the server-side half of that branch. The lobby UI (Phase 4/6)
 * calls `resolveEntryPath` to decide which screen to render and
 * `createGuestIdentity` when the visitor submits a name.
 *
 * Anti-impersonation note: `isHost` is ALWAYS derived from an authenticated
 * session's user id compared against meeting.hostId — never from anything the
 * client sends. Guests can never be hosts.
 */

export type EntryPath = { action: "join"; userId: string } | { action: "enter-name" };

/**
 * Decide what an unauthenticated/authenticated visitor should see.
 * Pure and synchronous — trivially unit-testable.
 */
export function resolveEntryPath(input: {
  isAuthenticated: boolean;
  userId?: string | null;
}): EntryPath {
  if (input.isAuthenticated && input.userId) {
    return { action: "join", userId: input.userId };
  }
  return { action: "enter-name" };
}

/**
 * Create a transient guest identity from validated input.
 * The id is generated server-side (randomUUID) so guests cannot choose or
 * collide with authenticated user ids.
 */
export function createGuestIdentity(
  payload: unknown,
): { success: true; identity: GuestIdentity } | { success: false; error: string } {
  const parsed = parseGuestJoinRequest(payload);

  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  return {
    success: true,
    identity: {
      kind: "guest",
      guestId: randomUUID(),
      displayName: parsed.data.name,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Route handler for POST /api/auth/guest — validates the submitted name and
 * returns a transient guest identity. Rate limiting is applied by callers via
 * features/auth/rate-limiter (the auth route wrapper covers /api/auth/*).
 */
export async function handleGuestJoin(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = createGuestIdentity(body);

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 422 });
  }

  // Phase 6: persist guest identity in httpOnly cookie
  const cookieValue = JSON.stringify(result.identity);
  const maxAge = 60 * 60 * 24; // 24 hours

  const response = Response.json({ identity: result.identity }, { status: 201 });
  response.headers.set(
    "Set-Cookie",
    `sudomeet_guest=${encodeURIComponent(cookieValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );

  return response;
}
