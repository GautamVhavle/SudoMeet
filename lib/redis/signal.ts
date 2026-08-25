/**
 * Redis-based signaling infrastructure for Tier A P2P mesh.
 *
 * Architecture:
 *   Client → GET /api/signal/[meetingId] (SSE) → Redis pub/sub → relay to browser
 *   Client → POST /api/signal/[meetingId] → Redis pub/sub → broadcast to all subscribers
 *
 * Handles missing Redis credentials gracefully (in-memory fallback for local dev).
 */

import { Redis } from "@upstash/redis";

import type { SignalEvent } from "@/lib/media/types";
import { pubsubChannel } from "./index";

let redis: Redis | null = null;

/**
 * Get or create the Redis client. Returns null if credentials are missing.
 * Gracefully degrades so build/dev server doesn't crash without Redis.
 */
function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[Redis] Missing credentials - signaling will not work in production");
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

/**
 * Publish a signal event to the meeting's signaling channel.
 * No-op if Redis is unavailable.
 *
 * Note: Upstash Redis REST API doesn't support native pub/sub.
 * We use a Redis list as a queue instead.
 */
export async function publishSignal(
  meetingId: string,
  event: SignalEvent,
): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    console.warn("[Redis] Cannot publish signal - no client");
    return;
  }

  const channel = pubsubChannel("signal", meetingId);
  const listKey = `${channel}:events`;

  // Push event to the list (acts as a queue for SSE polling)
  await client.rpush(listKey, JSON.stringify(event));

  // Set TTL on the list to auto-expire after 1 hour
  await client.expire(listKey, 3600);
}

/**
 * Subscribe to signaling events for a meeting.
 * Returns an async iterator that yields SignalEvent objects.
 *
 * Note: Upstash Redis REST API does not support native pub/sub subscriptions.
 * SSE-based polling is implemented in the API route instead.
 */
export async function* subscribeToSignals(
  _meetingId: string,
): AsyncGenerator<SignalEvent> {
  const client = getRedisClient();
  if (!client) {
    console.warn("[Redis] Cannot subscribe to signals - no client");
    return;
  }

  // This is a placeholder for the SSE implementation in the API route.
  // The actual subscription happens via GET /api/signal/[meetingId].
  throw new Error(
    "Direct Redis subscription not supported. Use SSE endpoint instead.",
  );
}

/**
 * In-memory fallback for local dev without Redis.
 * Subscribers indexed by meetingId.
 */
const inMemorySubscribers = new Map<
  string,
  Set<(event: SignalEvent) => void>
>();

/**
 * Publish signal event to in-memory subscribers (local dev fallback).
 */
export function publishSignalInMemory(
  meetingId: string,
  event: SignalEvent,
): void {
  const subscribers = inMemorySubscribers.get(meetingId);
  if (!subscribers) return;

  subscribers.forEach((callback) => {
    try {
      callback(event);
    } catch (error) {
      console.error("[InMemorySignal] Subscriber error:", error);
    }
  });
}

/**
 * Subscribe to in-memory signals (local dev fallback).
 * Returns unsubscribe function.
 */
export function subscribeToSignalsInMemory(
  meetingId: string,
  callback: (event: SignalEvent) => void,
): () => void {
  if (!inMemorySubscribers.has(meetingId)) {
    inMemorySubscribers.set(meetingId, new Set());
  }

  const subscribers = inMemorySubscribers.get(meetingId)!;
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      inMemorySubscribers.delete(meetingId);
    }
  };
}
