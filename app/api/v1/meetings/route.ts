/**
 * Public API: Create meetings programmatically.
 * POST /api/v1/meetings — create a new meeting via API key.
 */

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

import { authenticateApiRequest } from "@/lib/api/auth";
import { prisma } from "@/lib/db";

export { dynamic } from "@/app/dynamic-exports";

interface CreateMeetingRequest {
  roomCode?: string;
  title: string;
  maxParticipants?: number;
  mediaProvider?: "P2P" | "LIVEKIT";
}

interface CreateMeetingResponse {
  id: string;
  roomCode: string;
  title: string;
  joinUrl: string;
  createdAt: string;
}

export async function POST(request: Request): Promise<Response> {
  // Authenticate API key
  const auth = await authenticateApiRequest();
  if (!auth.authenticated || !auth.apiKey) {
    return NextResponse.json(
      { error: auth.error || "Authentication required" },
      { status: 401 }
    );
  }

  const body = (await request.json()) as CreateMeetingRequest;

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json(
      { error: "Missing required field: title" },
      { status: 400 }
    );
  }

  const roomCode = body.roomCode || nanoid(10);
  const slug = roomCode.toLowerCase();

  // Check for existing meeting with this roomCode
  const existing = await prisma.meeting.findUnique({
    where: { roomCode },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Room code already in use" },
      { status: 409 }
    );
  }

  const meeting = await prisma.meeting.create({
    data: {
      roomCode,
      slug,
      title: body.title,
      hostId: auth.apiKey.userId,
      mediaProvider: body.mediaProvider || "P2P",
      maxParticipants: body.maxParticipants || 4,
      status: "WAITING",
    },
  });

  const joinUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/m/${roomCode}`;

  const response: CreateMeetingResponse = {
    id: meeting.id,
    roomCode: meeting.roomCode,
    title: meeting.title,
    joinUrl,
    createdAt: meeting.createdAt.toISOString(),
  };

  return NextResponse.json(response, { status: 201 });
}
