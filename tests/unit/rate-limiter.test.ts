import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TokenBucketRateLimiter, getClientIp } from "../../features/auth/rate-limiter";

describe("TokenBucketRateLimiter", () => {
  it("allows requests within capacity", async () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 3, refillPerSecond: 0 });
    const first = await limiter.check("key-a");
    const second = await limiter.check("key-a");
    const third = await limiter.check("key-a");

    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, true);
    assert.equal(third.remaining, 0);
  });

  it("blocks once the bucket is empty and reports retry timing", async () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillPerSecond: 0.5 });

    await limiter.check("key-b");
    await limiter.check("key-b");
    const blocked = await limiter.check("key-b");

    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterMs > 0);
    assert.ok(blocked.retryAfterMs <= 2000); // ≤ 1 token at 0.5/s
  });

  it("isolates buckets per key", async () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 1, refillPerSecond: 0 });

    assert.equal((await limiter.check("ip-1")).allowed, true);
    assert.equal((await limiter.check("ip-1")).allowed, false);
    assert.equal((await limiter.check("ip-2")).allowed, true);
  });

  it("refills tokens over time (fake-clock via short waits)", async () => {
    // 20 tokens/sec → a drained bucket refills in ~50ms.
    const limiter = new TokenBucketRateLimiter({ capacity: 1, refillPerSecond: 20 });

    assert.equal((await limiter.check("key-c")).allowed, true);
    assert.equal((await limiter.check("key-c")).allowed, false);

    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal((await limiter.check("key-c")).allowed, true);
  });

  it("respects the RateLimiter interface shape", async () => {
    const limiter = new TokenBucketRateLimiter();
    const result = await limiter.check("shape-check");

    assert.deepEqual(Object.keys(result).sort(), [
      "allowed",
      "remaining",
      "retryAfterMs",
    ]);
  });
});

describe("getClientIp", () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request("https://sudomeet.test/api/auth/session", { headers });
  }

  it("prefers the first x-forwarded-for entry", () => {
    const ip = getClientIp(makeRequest({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" }));
    assert.equal(ip, "203.0.113.7");
  });

  it("falls back to x-real-ip then unknown", () => {
    assert.equal(
      getClientIp(makeRequest({ "x-real-ip": "198.51.100.9" })),
      "198.51.100.9",
    );
    assert.equal(getClientIp(makeRequest({})), "unknown");
  });
});
