import { handleGuestJoin } from "@/features/auth/guest-flow";

export { dynamic } from "@/app/dynamic-exports";

/**
 * POST /api/auth/guest — create a transient guest identity.
 * Storage design only this phase (plan Phase 3); cookie persistence and the
 * lobby UI arrive in Phase 4/6.
 */
export async function POST(request: Request): Promise<Response> {
  return handleGuestJoin(request);
}
