/**
 * LiveKit token endpoint.
 *
 * POST /api/livekit/token — Mint a join token for LiveKit room
 *
 * Flow:
 * 1. Authenticate user (session or guest)
 * 2. Verify meeting exists and user may join
 * 3. Mint short-lived token with participant identity/name
 * 4. Return token + LiveKit URL
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mintLiveKitToken } from "@/lib/media/livekit";
import { getLiveKitEnv } from "@/lib/env";

const TokenRequestSchema = z.object({
  meetingId: z.string().min(1),
  participantName: z.string().min(1).max(100),
});

/**
 * POST /api/livekit/token — Mint LiveKit join token.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const parseResult = TokenRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { meetingId, participantName } = parseResult.data;

    // Check authentication (allow both authenticated users and guests)
    const session = await auth();
    const userId = session?.user?.id;

    // Verify meeting exists and check access permissions
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        roomCode: true,
        mediaProvider: true,
        status: true,
        isLocked: true,
        requiresHostApproval: true,
        maxParticipants: true,
        hostId: true,
        _count: {
          select: {
            participants: {
              where: {
                leftAt: null, // Only count active participants
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Verify meeting uses LiveKit provider
    if (meeting.mediaProvider !== "LIVEKIT") {
      return NextResponse.json(
        { error: "Meeting does not use LiveKit provider" },
        { status: 400 },
      );
    }

    // Check meeting status
    if (meeting.status === "ENDED" || meeting.status === "EXPIRED") {
      return NextResponse.json({ error: "Meeting has ended" }, { status: 403 });
    }

    // Check if meeting is locked
    if (meeting.isLocked && meeting.hostId !== userId) {
      return NextResponse.json({ error: "Meeting is locked" }, { status: 403 });
    }

    // Check participant limit
    if (meeting._count.participants >= meeting.maxParticipants) {
      return NextResponse.json(
        { error: "Meeting has reached maximum capacity" },
        { status: 403 },
      );
    }

    // Note: requiresHostApproval is handled client-side via waiting room UI
    // This endpoint mints tokens for approved participants

    // Get LiveKit credentials
    const { livekitUrl, livekitApiKey, livekitApiSecret } = getLiveKitEnv();

    // Determine participant identity
    // Use userId if authenticated, otherwise generate guest identity
    const participantIdentity = userId || `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Mint token
    const token = await mintLiveKitToken({
      livekitUrl,
      apiKey: livekitApiKey,
      apiSecret: livekitApiSecret,
      roomName: meeting.roomCode,
      participantIdentity,
      participantName,
      ttl: 3600, // 1 hour
    });

    return NextResponse.json({
      token,
      livekitUrl,
      roomName: meeting.roomCode,
    });
  } catch (error) {
    console.error("[LiveKit Token API] Error:", error);

    // Handle missing LiveKit credentials gracefully
    if (error instanceof Error && error.message.includes("LiveKit credentials")) {
      return NextResponse.json(
        {
          error: "LiveKit not configured",
          message:
            "LiveKit credentials are missing. Please use P2P mode or configure LiveKit environment variables.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to mint LiveKit token" },
      { status: 500 },
    );
  }
}
