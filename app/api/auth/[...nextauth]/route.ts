import type { NextRequest } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/config";
import { getClientIp, authRateLimiter } from "@/features/auth/rate-limiter";

const { handlers } = NextAuth(authConfig);

/**
 * Auth.js catch-all route with a rate-limit gate in front of the mutating
 * endpoints (signin/signout/callback). Read-only endpoints (session,
 * providers, csrf) pass through untouched so page loads are never throttled.
 *
 * CSRF safety is delegated to Auth.js's built-in double-submit cookie checks
 * on POST routes — no custom token handling here.
 */

const MUTATING_SEGMENTS = new Set(["signin", "signout", "callback"]);

function isMutatingAuthRequest(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments.at(-1);
  return last !== undefined && MUTATING_SEGMENTS.has(last);
}

async function rateLimit(request: NextRequest): Promise<Response | null> {
  if (!isMutatingAuthRequest(new URL(request.url).pathname)) return null;

  const key = `auth:${getClientIp(request)}`;
  const result = await authRateLimiter.check(key);

  if (!result.allowed) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(result.retryAfterMs / 1000).toString(),
        },
      },
    );
  }

  return null;
}

export async function GET(
  request: NextRequest,
  _context: { params: Promise<{ nextauth: string[] }> },
): Promise<Response> {
  const blocked = await rateLimit(request);
  if (blocked) return blocked;
  return handlers.GET(request);
}

export async function POST(
  request: NextRequest,
  _context: { params: Promise<{ nextauth: string[] }> },
): Promise<Response> {
  const blocked = await rateLimit(request);
  if (blocked) return blocked;
  return handlers.POST(request);
}
