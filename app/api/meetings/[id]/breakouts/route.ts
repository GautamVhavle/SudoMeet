/**
 * Breakout rooms API route.
 *
 * POST /api/meetings/:id/breakouts — create a breakout room
 * GET /api/meetings/:id/breakouts — list breakout rooms
 *
 * Phase 12: Recording and breakout rooms.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createBreakoutRoom,
  getBreakoutRooms,
  type CreateBreakoutRoomRequest,
} from "@/lib/breakout";

/**
 * Create a new breakout room.
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
        { error: "Only the host can create breakout rooms" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, capacity } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Breakout room name is required" },
        { status: 400 },
      );
    }

    const createRequest: CreateBreakoutRoomRequest = {
      meetingId,
      name,
      capacity: capacity ?? 0,
    };

    const breakoutRoom = await createBreakoutRoom(createRequest);

    return NextResponse.json(breakoutRoom, { status: 201 });
  } catch (error) {
    console.error("[POST /api/meetings/:id/breakouts] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create breakout room",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * List all breakout rooms for a meeting.
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

    // Verify user has access to this meeting
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const breakoutRooms = await getBreakoutRooms(meetingId);

    return NextResponse.json({ breakoutRooms });
  } catch (error) {
    console.error("[GET /api/meetings/:id/breakouts] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch breakout rooms" },
      { status: 500 },
    );
  }
}
