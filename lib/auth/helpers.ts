import { redirect } from "next/navigation";

import { auth } from "./server";

/**
 * Session helpers for server components and route handlers.
 *
 * Phase 4 usage pattern:
 *
 *   // In a server component or route handler:
 *   import { requireUser, getSessionUserId } from "@/lib/auth";
 *
 *   export default async function DashboardPage() {
 *     const user = await requireUser();          // redirects to /login if absent
 *     const userId = await getSessionUserId();   // null when signed out
 *   }
 */

/**
 * Return the current session's user id, or null when not authenticated.
 * Never throws — use this for optional personalization.
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Require an authenticated session. Redirects to /login with a `callbackUrl`
 * preserving the current location when unauthenticated.
 */
export async function requireUser(callbackUrl?: string): Promise<string> {
  const userId = await getSessionUserId();

  if (!userId) {
    const target = callbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";
    redirect(target);
  }

  return userId;
}
