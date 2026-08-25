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

/** Signal logs are short-lived — handshakes complete within seconds. */
const SIGNAL_TTL_SECONDS = 600;

/** Cap the log so a long meeting can't grow it without bound. */
const SIGNAL_LOG_MAX = 500;

let redis: Redis | null = null;

/**
 * Get or create the Redis client. Returns null if credentials are missing.
 * Gracefully degrades so build/dev server doesn't crash without Redis.
 */
export function getSignalRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

export function signalLogKey(meetingId: string): string {
  return `${pubsubChannel("signal", meetingId)}:events`;
}

/**
 * Append an event to the meeting's signal log.
 *
 * The log is append-only. Deleting consumed entries (the previous behaviour)
 * meant whichever subscriber polled first swallowed the events and every other
 * device in the room saw nothing.
 */
export async function publishSignal(
  meetingId: string,
  event: SignalEvent,
): Promise<void> {
  const client = getSignalRedis();
  if (!client) return;

  const key = signalLogKey(meetingId);
  const length = await client.rpush(key, JSON.stringify(event));

  if (length > SIGNAL_LOG_MAX) {
    await client.ltrim(key, -SIGNAL_LOG_MAX, -1);
  }
  await client.expire(key, SIGNAL_TTL_SECONDS);
}

/**
 * Read events appended after `cursor`. Non-destructive, so every subscriber
 * observes the full stream. Returns the advanced cursor with the events.
 */
export async function readSignalsSince(
  meetingId: string,
  cursor: number,
): Promise<{ events: SignalEvent[]; cursor: number }> {
  const client = getSignalRedis();
  if (!client) return { events: [], cursor };

  const raw = await client.lrange(signalLogKey(meetingId), cursor, -1);
  if (raw.length === 0) return { events: [], cursor };

  const events: SignalEvent[] = [];
  for (const entry of raw) {
    const parsed = parseEntry(entry);
    if (parsed) events.push(parsed);
  }

  return { events, cursor: cursor + raw.length };
}

/** Current log length, used to skip backlog when a subscriber attaches. */
export async function getSignalLogLength(meetingId: string): Promise<number> {
  const client = getSignalRedis();
  if (!client) return 0;
  return client.llen(signalLogKey(meetingId));
}

// Upstash may hand back already-parsed objects depending on response encoding.
function parseEntry(entry: unknown): SignalEvent | null {
  if (entry && typeof entry === "object") return entry as SignalEvent;
  if (typeof entry !== "string") return null;
  try {
    return JSON.parse(entry) as SignalEvent;
  } catch {
    return null;
  }
}

/**
 * In-memory bus for local dev / single-instance deploys.
 *
 * Held on globalThis so Next.js hot reloads (and repeated route-module
 * evaluation) don't split publishers from subscribers — which made two tabs
 * look connected while neither received anything.
 */
type SignalListener = (event: SignalEvent) => void;

const globalBus = globalThis as unknown as {
  __sudomeetSignalBus?: Map<string, Set<SignalListener>>;
};

function bus(): Map<string, Set<SignalListener>> {
  if (!globalBus.__sudomeetSignalBus) {
    globalBus.__sudomeetSignalBus = new Map();
  }
  return globalBus.__sudomeetSignalBus;
}

/**
 * Publish signal event to in-memory subscribers (local dev fallback).
 */
export function publishSignalInMemory(
  meetingId: string,
  event: SignalEvent,
): void {
  const listeners = bus().get(meetingId);
  if (!listeners) return;

  // Copy first: a listener may unsubscribe while we iterate.
  for (const listener of Array.from(listeners)) {
    try {
      listener(event);
    } catch (error) {
      console.error("[InMemorySignal] Subscriber error:", error);
    }
  }
}

/**
 * Subscribe to in-memory signals (local dev fallback).
 * Returns unsubscribe function.
 */
export function subscribeToSignalsInMemory(
  meetingId: string,
  callback: SignalListener,
): () => void {
  const registry = bus();
  let listeners = registry.get(meetingId);
  if (!listeners) {
    listeners = new Set();
    registry.set(meetingId, listeners);
  }
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) registry.delete(meetingId);
  };
}
