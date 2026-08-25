/**
 * Shared route-segment config exports.
 *
 * Next.js route files may only export known segment keys; keeping shared
 * constants here lets multiple routes re-export them without duplication.
 */

/** Auth-backed pages must always render per-request (session-aware). */
export const dynamic = "force-dynamic";
