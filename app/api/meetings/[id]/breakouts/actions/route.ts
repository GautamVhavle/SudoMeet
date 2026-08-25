/**
 * Breakout room assignment API route.
 *
 * POST /api/meetings/:id/breakouts/assign — assign participants to breakout rooms
 * POST /api/meetings/:id/breakouts/broadcast — broadcast message to all breakouts
 * POST /api/meetings/:id/breakouts/return — return all participants to main room
 *
 * Phase 12: Recording and breakout rooms.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  assignParticipants,
  broadcastToBreakouts,
  returnAllToMainRoom,
  type AssignParticipantsRequest,
  type BreakoutBroadcast,
} from "@/lib/breakout";

/**
 * Assign participants to breakout rooms.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const meetingId = params.id;

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
        { error: "Only the host can assign participants" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action, assignments, broadcast } = body;

    // Handle different actions
    if (action === "assign") {
      if (!assignments || !Array.isArray(assignments)) {
        return NextResponse.json(
          { error: "assignments array is required" },
          { status: 400 },
        );
      }

      const assignRequest: AssignParticipantsRequest = {
        meetingId,
        assignments,
      };

      const result = await assignParticipants(assignRequest);
      return NextResponse.json({ assignments: result });
    }

    if (action === "broadcast") {
      if (!broadcast || typeof broadcast !== "object") {
        return NextResponse.json(
          { error: "broadcast object is required" },
          { status: 400 },
        );
      }

      const broadcastMessage: BreakoutBroadcast = broadcast;
      await broadcastToBreakouts(meetingId, broadcastMessage);
      return NextResponse.json({ success: true });
    }

    if (action === "return") {
      await returnAllToMainRoom(meetingId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported: assign, broadcast, return" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[POST /api/meetings/:id/breakouts/actions] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to perform breakout action",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
