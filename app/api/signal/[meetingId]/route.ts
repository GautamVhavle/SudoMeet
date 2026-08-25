/**
 * Signaling API for Tier A P2P mesh.
 *
 * GET /api/signal/[meetingId] — SSE stream of signaling events (Redis pub/sub)
 * POST /api/signal/[meetingId] — Publish a signal event to the room
 *
 * Architecture:
 *   Client → GET (SSE) → Redis pub/sub → relay to browser
 *   Client → POST → Redis pub/sub → broadcast to all subscribers
 *
 * Gracefully handles missing Redis (in-memory fallback for local dev).
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { z } from "zod";

import type { SignalEvent } from "@/lib/media/types";
import { pubsubChannel } from "@/lib/redis";
import {
  publishSignal,
  publishSignalInMemory,
  subscribeToSignalsInMemory,
} from "@/lib/redis/signal";

// Validate signal event schema
const SignalEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("peer-joined"),
    peerId: z.string(),
  }),
  z.object({
    type: z.literal("offer"),
    from: z.string(),
    to: z.string(),
    payload: z.any(), // RTCSessionDescriptionInit
  }),
  z.object({
    type: z.literal("answer"),
    from: z.string(),
    to: z.string(),
    payload: z.any(), // RTCSessionDescriptionInit
  }),
  z.object({
    type: z.literal("ice-candidate"),
    from: z.string(),
    to: z.string(),
    payload: z.any(), // RTCIceCandidateInit
  }),
  z.object({
    type: z.literal("peer-left"),
    peerId: z.string(),
  }),
]);

// Redis client (lazy-initialized)
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[Signal API] Missing Redis credentials - using in-memory fallback");
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

/**
 * GET /api/signal/[meetingId] — SSE stream of signaling events.
 *
 * Uses Redis pub/sub if available, otherwise falls back to in-memory.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;

  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  const client = getRedisClient();

  // SSE response setup
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send keepalive every 30s
      const keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 30000);

      if (client) {
        // Redis pub/sub (production)
        await subscribeWithRedis(meetingId, controller, encoder);
      } else {
        // In-memory fallback (local dev)
        subscribeWithInMemory(meetingId, controller, encoder);
      }

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * POST /api/signal/[meetingId] — Publish a signal event.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;

  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  const body = await request.json();
  const result = SignalEventSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid signal event", details: result.error },
      { status: 400 },
    );
  }

  const event = result.data as SignalEvent;
  const client = getRedisClient();

  if (client) {
    // Publish to Redis
    await publishSignal(meetingId, event);
  } else {
    // In-memory fallback
    publishSignalInMemory(meetingId, event);
  }

  return NextResponse.json({ success: true });
}

/**
 * Subscribe to Redis pub/sub and stream events via SSE.
 *
 * Note: Upstash Redis REST API doesn't support native pub/sub subscriptions.
 * We use polling with a Redis list as a workaround.
 */
async function subscribeWithRedis(
  meetingId: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  const client = getRedisClient();
  if (!client) return;

  const channel = pubsubChannel("signal", meetingId);
  const listKey = `${channel}:events`;

  // Poll for events every 500ms
  const pollInterval = setInterval(async () => {
    try {
      // Pop events from the list (BLPOP with timeout)
      const events = await client.lrange(listKey, 0, -1);
      if (events.length > 0) {
        // Clear the list
        await client.del(listKey);

        // Stream each event
        events.forEach((eventJson) => {
          controller.enqueue(encoder.encode(`data: ${eventJson}\n\n`));
        });
      }
    } catch (error) {
      console.error("[Signal API] Redis poll error:", error);
    }
  }, 500);

  // Cleanup on disconnect
  return () => {
    clearInterval(pollInterval);
  };
}

/**
 * Subscribe to in-memory signals and stream via SSE (local dev fallback).
 */
function subscribeWithInMemory(
  meetingId: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  const unsubscribe = subscribeToSignalsInMemory(meetingId, (event) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  });

  return unsubscribe;
}
