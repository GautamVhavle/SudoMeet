/**
 * Chat API routes for a meeting.
 *
 * GET  /api/chat/[meetingId] — Fetch message history
 * POST /api/chat/[meetingId] — Send a new message
 *
 * Architecture:
 * - All messages stored in Postgres (source of truth)
 * - Realtime delivery via Redis pub/sub
 * - SSE clients subscribe to the "events:{meetingId}" channel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMeetingRedis } from "@/lib/redis";
import { storeMessage, fetchMessages } from "@/lib/chat/persistence";
import { SendMessageSchema, FetchMessagesSchema } from "@/lib/chat/validation";

interface RouteContext {
  params: Promise<{ meetingId: string }>;
}

/**
 * GET /api/chat/[meetingId] — Fetch message history (paginated).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { meetingId } = await context.params;

    // Verify meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const parseResult = FetchMessagesSchema.safeParse({
      limit: searchParams.get("limit"),
      before: searchParams.get("before"),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const messages = await fetchMessages({
      meetingId,
      ...parseResult.data,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[chat/GET] Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chat/[meetingId] — Send a new message.
 *
 * Flow:
 * 1. Validate request body
 * 2. Store in Postgres (source of truth)
 * 3. Publish to Redis "events:{meetingId}" channel for realtime delivery
 * 4. Return the stored message
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    const { meetingId } = await context.params;

    // Verify meeting exists and is active
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, status: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.status !== "ACTIVE" && meeting.status !== "WAITING") {
      return NextResponse.json(
        { error: "Meeting is not active" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = SendMessageSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid message", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    // Determine sender identity (authenticated user or guest)
    const userId = session?.user?.id ?? null;
    const senderName = session?.user?.name ?? "Guest";
    const senderImage = session?.user?.image ?? null;

    // Store message in database (source of truth)
    const message = await storeMessage({
      meetingId,
      userId,
      body: parseResult.data.body,
      senderName,
      senderImage,
    });

    // Publish to realtime channel for immediate delivery to SSE clients
    try {
      const redis = getMeetingRedis(meetingId);
      await redis.publishEvent({
        type: "chat",
        data: message,
      });
    } catch (redisError) {
      // Non-fatal: message is stored in DB, realtime delivery failed
      console.warn("[chat/POST] Redis publish failed (message stored):", redisError);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[chat/POST] Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
