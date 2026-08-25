/**
 * Recording API route — start/stop recording for a meeting.
 *
 * POST /api/meetings/:id/recording — start recording
 * DELETE /api/meetings/:id/recording — stop recording
 *
 * Phase 12: Recording and breakout rooms.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { startRecordingEgress, stopRecordingEgress } from "@/lib/recording";
import type { EgressConfig } from "@/lib/recording";

/**
 * Check if R2 and LiveKit recording config is available.
 */
function getRecordingConfig(): EgressConfig | null {
  const {
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    R2_BUCKET,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
  } = env.server;

  if (
    !LIVEKIT_URL ||
    !LIVEKIT_API_KEY ||
    !LIVEKIT_API_SECRET ||
    !R2_BUCKET ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY
  ) {
    return null;
  }

  return {
    livekitUrl: LIVEKIT_URL,
    apiKey: LIVEKIT_API_KEY,
    apiSecret: LIVEKIT_API_SECRET,
    r2Bucket: R2_BUCKET,
    r2AccessKeyId: R2_ACCESS_KEY_ID,
    r2SecretAccessKey: R2_SECRET_ACCESS_KEY,
  };
}

/**
 * Start recording a meeting.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const meetingId = params.id;

    // Check recording config availability
    const config = getRecordingConfig();
    if (!config) {
      return NextResponse.json(
        {
          error: "Recording not available",
          message: "LiveKit and R2 credentials are not configured",
        },
        { status: 503 },
      );
    }

    // Verify meeting exists and user is host
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, roomCode: true, hostId: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.hostId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the host can start recording" },
        { status: 403 },
      );
    }

    // Check if already recording
    const existingRecording = await prisma.recording.findFirst({
      where: {
        meetingId,
        endedAt: null, // Active recording
      },
    });

    if (existingRecording) {
      return NextResponse.json(
        { error: "Recording already in progress" },
        { status: 409 },
      );
    }

    // Start LiveKit egress
    const { egressId, storageKey } = await startRecordingEgress(
      config,
      meeting.roomCode,
      meetingId,
    );

    // Create recording record
    const recording = await prisma.recording.create({
      data: {
        meetingId,
        storageKey,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: recording.id,
      egressId,
      status: "STARTING",
      storageKey: recording.storageKey,
      startedAt: recording.startedAt,
    });
  } catch (error) {
    console.error("[POST /api/meetings/:id/recording] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to start recording",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Stop recording a meeting.
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const meetingId = params.id;

    // Check recording config availability
    const config = getRecordingConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Recording not available" },
        { status: 503 },
      );
    }

    // Verify meeting exists and user is host
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, hostId: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.hostId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the host can stop recording" },
        { status: 403 },
      );
    }

    // Find active recording
    const recording = await prisma.recording.findFirst({
      where: {
        meetingId,
        endedAt: null,
      },
    });

    if (!recording) {
      return NextResponse.json(
        { error: "No active recording found" },
        { status: 404 },
      );
    }

    // Extract egress ID from URL params (if provided)
    const url = new URL(request.url);
    const egressId = url.searchParams.get("egressId");

    if (!egressId) {
      return NextResponse.json(
        { error: "egressId is required" },
        { status: 400 },
      );
    }

    // Stop LiveKit egress
    await stopRecordingEgress(config, egressId);

    // Update recording record
    await prisma.recording.update({
      where: { id: recording.id },
      data: { endedAt: new Date() },
    });

    return NextResponse.json({
      id: recording.id,
      status: "STOPPING",
      endedAt: new Date(),
    });
  } catch (error) {
    console.error("[DELETE /api/meetings/:id/recording] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to stop recording",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Get recording status for a meeting.
 */
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const meetingId = params.id;

    // Get all recordings for this meeting
    const recordings = await prisma.recording.findMany({
      where: { meetingId },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({ recordings });
  } catch (error) {
    console.error("[GET /api/meetings/:id/recording] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 },
    );
  }
}
