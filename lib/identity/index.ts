import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getIpHash } from "./ip";

export const COOKIE_ID = "sudomeet_id";
export const COOKIE_NAME = "sudomeet_name";

export interface AnonymousIdentity {
  id: string;
  displayName: string;
  ipHash: string;
}

function guestName(id: string): string {
  return `Guest-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/**
 * Always returns an identity — never redirects, never 401.
 * Cookie `sudomeet_id` is primary (1yr, HttpOnly, SameSite=Lax).
 * IP hash is fallback only (cookie blocked).
 * Refresh-persistent: cookie survives refresh/tab close.
 */
export async function getOrCreateIdentity(): Promise<AnonymousIdentity> {
  const store = await cookies();
  const ipHash = await getIpHash();

  let id = store.get(COOKIE_ID)?.value ?? null;
  let displayName = store.get(COOKIE_NAME)?.value
    ? decodeURIComponent(store.get(COOKIE_NAME)!.value)
    : null;

  let needsSet = false;
  if (!id) {
    // Validate existing value looks like uuid, else regenerate
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (id && !uuidRe.test(id)) id = null;
    if (!id) {
      id = randomUUID();
      needsSet = true;
    }
  }
  if (!displayName) {
    displayName = guestName(id);
    needsSet = true;
  }

  if (needsSet) {
    // Next.js cookies() is mutable in RSC/Route Handlers — set if missing
    try {
      store.set(COOKIE_ID, id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        secure: process.env.NODE_ENV === "production",
      });
      store.set(COOKIE_NAME, encodeURIComponent(displayName), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        secure: process.env.NODE_ENV === "production",
      });
    } catch {
      // cookies() may be read-only in some contexts (e.g. middleware) — ignore
    }
  }

  return { id, displayName, ipHash };
}

/**
 * Update display name (call from server action / route handler).
 */
export async function setDisplayName(name: string): Promise<void> {
  const store = await cookies();
  const trimmed = name.trim().slice(0, 32) || "Guest";
  store.set(COOKIE_NAME, encodeURIComponent(trimmed), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
}
