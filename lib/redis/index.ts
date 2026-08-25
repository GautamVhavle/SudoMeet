/**
 * Upstash Redis REST client wrapper (Tier A realtime infrastructure).
 *
 * All meeting-scoped state lives under per-meeting namespaces so keys can be
 * scanned/evicted per meeting and never collide across meetings:
 *
 *   presence:{meetingId}   — who is in the room right now (TTL'd heartbeats)
 *   signal:{meetingId}     — WebRTC offer/answer/candidate relay (pub/sub)
 *   events:{meetingId}     — meeting lifecycle fan-out for SSE (pub/sub)
 *   chat:{meetingId}       — chat message buffer (list)
 *   reactions:{meetingId}  — emoji reaction bursts (pub/sub)
 *
 * Pure key logic is unit-tested without live credentials; network methods are
 * thin pass-throughs to the shared @upstash/redis client.
 */

import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

export type MeetingNamespace =
  | "presence"
  | "signal"
  | "events"
  | "chat"
  | "reactions";

const NAMESPACES: readonly MeetingNamespace[] = [
  "presence",
  "signal",
  "events",
  "chat",
  "reactions",
];

/** Build a namespaced key: `presence:abc123` or `presence:abc123:user_1`. */
export function redisKey(
  namespace: MeetingNamespace,
  meetingId: string,
  suffix?: string,
): string {
  return suffix === undefined
    ? `${namespace}:${meetingId}`
    : `${namespace}:${meetingId}:${suffix}`;
}

/** Pub/sub channel name for a namespace (same shape as keys). */
export function pubsubChannel(
  namespace: MeetingNamespace,
  meetingId: string,
): string {
  return redisKey(namespace, meetingId);
}

/** Type guard for valid namespaces. */
export function isMeetingNamespace(value: string): value is MeetingNamespace {
  return (NAMESPACES as readonly string[]).includes(value);
}

let client: Redis | undefined;

function getRedisClient(): Redis {
  if (!client) {
    if (
      !env.server.UPSTASH_REDIS_REST_URL ||
      !env.server.UPSTASH_REDIS_REST_TOKEN
    ) {
      throw new Error(
        "❌ Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. " +
          "Redis-backed features are unavailable until these are set.",
      );
    }
    client = new Redis({
      url: env.server.UPSTASH_REDIS_REST_URL,
      token: env.server.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return client;
}

/** Reset the cached client (used by tests). */
export function resetRedisClientForTests(): void {
  client = undefined;
}

/**
 * Namespaced Redis access for a single meeting.
 */
export function getMeetingRedis(meetingId: string) {
  const key = (suffix?: string, namespace: MeetingNamespace = "presence") =>
    redisKey(namespace, meetingId, suffix);

  return {
    /** Raw namespaced key builder — handy for callers needing plain strings. */
    key,

    // ── presence TTL heartbeats ─────────────────────────────────────────────

        /** Record/refresh a participant's presence with a TTL heartbeat. */
    async setPresence(userId: string, ttlSeconds: number): Promise<number> {
      const result = await getRedisClient().set(
        redisKey("presence", meetingId, userId),
        Date.now(),
        { ex: ttlSeconds },
      );
      return result === "OK" ? 1 : Number(result ?? 0);
    },

    /** Convenience alias — heartbeats are just refreshed presence. */
    async heartbeat(userId: string, ttlSeconds: number): Promise<number> {
      return this.setPresence(userId, ttlSeconds);
    },

    /** Read the last-seen timestamp for a participant (null if expired). */
    async getPresence(userId: string): Promise<number | null> {
      const value = await getRedisClient().get<number>(
        redisKey("presence", meetingId, userId),
      );
      return value ?? null;
    },

    /** Explicitly remove a participant's presence (e.g. on leave). */
    async removePresence(userId: string): Promise<number> {
      return getRedisClient().del(redisKey("presence", meetingId, userId));
    },

    // ── signal / events / reactions pub-sub ─────────────────────────────────

    /** Publish a WebRTC signaling payload on the meeting's signal channel. */
    async publishSignal(payload: unknown): Promise<number> {
      return getRedisClient().publish(
        pubsubChannel("signal", meetingId),
        JSON.stringify(payload),
      );
    },

    /** Publish a meeting lifecycle event on the events (SSE fan-out) channel. */
    async publishEvent(payload: unknown): Promise<number> {
      return getRedisClient().publish(
        pubsubChannel("events", meetingId),
        JSON.stringify(payload),
      );
    },

    /** Publish an emoji reaction burst on the reactions channel. */
    async publishReaction(payload: unknown): Promise<number> {
      return getRedisClient().publish(
        pubsubChannel("reactions", meetingId),
        JSON.stringify(payload),
      );
    },

    // ── chat buffer ──────────────────────────────────────────────────────────

    /** Append a chat message to the meeting's chat buffer. */
    async pushChatMessage(
      message: Record<string, unknown>,
      options?: { ttlSeconds?: number },
    ): Promise<number> {
      const listKey = redisKey("chat", meetingId);
      const length = await getRedisClient().rpush(
        listKey,
        JSON.stringify(message),
      );
      if (options?.ttlSeconds !== undefined) {
        await getRedisClient().expire(listKey, options.ttlSeconds);
      }
      return length;
    },

    /** Read the most recent chat messages (oldest → newest). */
    async getRecentChatMessages(count = 50): Promise<string[]> {
      const stop = count <= 0 ? -1 : -count;
      return getRedisClient().lrange(redisKey("chat", meetingId), stop, -1);
    },
  };
}

export type MeetingRedis = ReturnType<typeof getMeetingRedis>;
