/**
 * Rate limiting for auth routes.
 *
 * Interface-first: callers depend on `RateLimiter`, so the in-memory token
 * bucket used today can be swapped for Upstash-backed distributed limiting in
 * Phase 7+ without touching call sites (ADR-001 style provider abstraction,
 * applied to rate limiting).
 *
 * In-memory scope caveat (documented, acceptable for now): buckets are per
 * server instance and reset on deploy. Sufficient for single-region dev and
 * early production; distributed limiting becomes mandatory with multi-region
 * or when abuse resistance matters more than convenience.
 */

export interface RateLimiter {
  /**
   * Consume one token for `key`. Returns whether the request is allowed plus
   * retry information for 429 responses.
   */
  check(key: string): Promise<RateLimitResult>;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until a blocked key may retry. */
  retryAfterMs: number;
  remaining: number;
}

interface TokenBucket {
  tokens: number;
  lastRefillMs: number;
}

export interface TokenBucketRateLimiterOptions {
  /** Maximum burst size (bucket capacity). */
  capacity: number;
  /** Tokens refilled per second. */
  refillPerSecond: number;
}

const DEFAULT_OPTIONS: TokenBucketRateLimiterOptions = {
  capacity: 5,
  refillPerSecond: 0.2, // ~1 request / 5s sustained
};

/**
 * In-memory token bucket. Pure time-based refill — no timers, no leaks.
 * Exported for tests; production code should use `authRateLimiter`.
 */
export class TokenBucketRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();

  constructor(
    private readonly options: TokenBucketRateLimiterOptions = DEFAULT_OPTIONS,
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const { capacity, refillPerSecond } = this.options;
    const now = Date.now();

    const bucket = this.buckets.get(key) ?? {
      tokens: capacity,
      lastRefillMs: now,
    };

    const elapsedSeconds = (now - bucket.lastRefillMs) / 1000;
    const refilled = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);

    if (refilled < 1) {
      this.buckets.set(key, { tokens: refilled, lastRefillMs: now });
      const deficit = 1 - refilled;
      return {
        allowed: false,
        retryAfterMs: Math.ceil((deficit / refillPerSecond) * 1000),
        remaining: 0,
      };
    }

    this.buckets.set(key, { tokens: refilled - 1, lastRefillMs: now });
    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: Math.floor(refilled - 1),
    };
  }

  /** Test helper: drop all state. */
  reset(): void {
    this.buckets.clear();
  }
}

/**
 * Shared limiter for auth routes. Generous enough that a human signing in a
 * few times is never throttled; tight enough to blunt credential stuffing.
 */
export const authRateLimiter = new TokenBucketRateLimiter({
  capacity: 10,
  refillPerSecond: 0.1, // sustained ~1 request / 10s per identity
});

/** Best-effort client identity for rate-limit keys. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
