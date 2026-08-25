/**
 * Signaling API for the Tier A P2P mesh.
 *
 * GET  /api/signal/[meetingId] — SSE stream of signaling events
 * POST /api/signal/[meetingId] — Publish a signal event to the room
 *
 * Fanout rules this route must uphold:
 *   - Every connected subscriber sees every event (no destructive reads).
 *   - Closing a stream tears down its poller/listener (no leaked intervals).
 *   - A subscriber only receives events published after it attached.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { SignalEvent } from "@/lib/media/types";
import {
  getSignalLogLength,
  getSignalRedis,
  publishSignal,
  publishSignalInMemory,
  readSignalsSince,
  subscribeToSignalsInMemory,
} from "@/lib/redis/signal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 250;
const KEEPALIVE_MS = 15_000;

const SignalEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("peer-joined"),
    peerId: z.string().min(1).max(128),
    name: z.string().max(80).optional(),
  }),
  z.object({
    type: z.literal("peer-ack"),
    from: z.string().min(1).max(128),
    to: z.string().min(1).max(128),
    name: z.string().max(80).optional(),
    isMicrophoneEnabled: z.boolean().optional(),
    isCameraEnabled: z.boolean().optional(),
    isScreenSharing: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("offer"),
    from: z.string().min(1).max(128),
    to: z.string().min(1).max(128),
    payload: z.any(),
  }),
  z.object({
    type: z.literal("answer"),
    from: z.string().min(1).max(128),
    to: z.string().min(1).max(128),
    payload: z.any(),
  }),
  z.object({
    type: z.literal("ice-candidate"),
    from: z.string().min(1).max(128),
    to: z.string().min(1).max(128),
    payload: z.any(),
  }),
  z.object({
    type: z.literal("peer-state"),
    from: z.string().min(1).max(128),
    isMicrophoneEnabled: z.boolean(),
    isCameraEnabled: z.boolean(),
    isScreenSharing: z.boolean(),
  }),
  z.object({
    type: z.literal("reaction"),
    participantId: z.string().min(1).max(128),
    participantName: z.string().max(80),
    emoji: z.string().min(1).max(16),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("peer-left"),
    peerId: z.string().min(1).max(128),
  }),
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;

  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const useRedis = getSignalRedis() !== null;

  // Start at the current tail so a fresh subscriber doesn't replay a stale
  // backlog of offers from an earlier session.
  const startCursor = useRedis ? await getSignalLogLength(meetingId) : 0;

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller already closed by an aborted request; stop writing.
          closed = true;
        }
      };

      const sendEvent = (event: SignalEvent) => {
        send(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Tell EventSource how fast to retry, and flush headers immediately.
      send("retry: 1000\n\n");
      send(": connected\n\n");

      const keepalive = setInterval(() => send(": keepalive\n\n"), KEEPALIVE_MS);

      let unsubscribe: (() => void) | null = null;
      let poller: ReturnType<typeof setInterval> | null = null;

      if (useRedis) {
        let cursor = startCursor;
        let polling = false;

        poller = setInterval(async () => {
          if (closed || polling) return;
          polling = true;
          try {
            const result = await readSignalsSince(meetingId, cursor);
            cursor = result.cursor;
            for (const event of result.events) sendEvent(event);
          } catch (error) {
            console.error("[Signal API] Redis poll error:", error);
          } finally {
            polling = false;
          }
        }, POLL_INTERVAL_MS);
      } else {
        unsubscribe = subscribeToSignalsInMemory(meetingId, sendEvent);
      }

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepalive);
        if (poller) clearInterval(poller);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      if (request.signal.aborted) {
        cleanup();
        return;
      }
      request.signal.addEventListener("abort", () => cleanup?.());
    },

    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Stops proxies (nginx, some CDNs) from buffering the stream.
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;

  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = SignalEventSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid signal event", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const event = result.data as SignalEvent;

  if (getSignalRedis()) {
    await publishSignal(meetingId, event);
  } else {
    publishSignalInMemory(meetingId, event);
  }

  return NextResponse.json({ success: true });
}
