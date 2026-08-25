/**
 * Presence API — heartbeat + participant tracking endpoint.
 *
 * GET /api/presence/[meetingId] — Get all active participants
 * POST /api/presence/[meetingId] — Update presence (set/update/remove/heartbeat)
 *
 * Handles missing Redis gracefully with in-memory fallback for local dev.
 */

import { NextRequest, NextResponse } from "next/server";

import type { PresenceData } from "@/lib/redis/presence";

// In-memory fallback for local dev without Redis
const inMemoryPresence = new Map<string, Map<string, PresenceData>>();

interface PresenceUpdatePayload {
  action: "set" | "update" | "remove" | "heartbeat";
  participantId: string;
  data?: PresenceData;
  updates?: Partial<PresenceData>;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await props.params;

  try {
    // Try to use Redis if available
    // For now, use in-memory fallback as full Redis scan would need server-side implementation

    // Get all presence keys for this meeting
    // For now, use in-memory fallback as full Redis scan would need server-side implementation
    const meetingPresence = inMemoryPresence.get(meetingId);
    const participants = meetingPresence 
      ? Array.from(meetingPresence.values())
      : [];

    return NextResponse.json({ participants });
  } catch (error) {
    console.warn("[presence] Redis unavailable, using in-memory fallback:", error);
    
    const meetingPresence = inMemoryPresence.get(meetingId);
    const participants = meetingPresence 
      ? Array.from(meetingPresence.values())
      : [];

    return NextResponse.json({ participants });
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await props.params;
  const payload: PresenceUpdatePayload = await req.json();
  const { action, participantId, data, updates } = payload;

  try {
    // Initialize meeting presence map if doesn't exist
    if (!inMemoryPresence.has(meetingId)) {
      inMemoryPresence.set(meetingId, new Map());
    }
    const meetingPresence = inMemoryPresence.get(meetingId)!;

    switch (action) {
      case "set": {
        if (!data) {
          return NextResponse.json(
            { error: "data required for set action" },
            { status: 400 },
          );
        }
        meetingPresence.set(participantId, {
          ...data,
          lastHeartbeat: Date.now(),
        });
        break;
      }

      case "update": {
        const existing = meetingPresence.get(participantId);
        if (!existing) {
          return NextResponse.json(
            { error: "participant not found" },
            { status: 404 },
          );
        }
        meetingPresence.set(participantId, {
          ...existing,
          ...updates,
          lastHeartbeat: Date.now(),
        });
        break;
      }

      case "remove": {
        meetingPresence.delete(participantId);
        break;
      }

      case "heartbeat": {
        const existing = meetingPresence.get(participantId);
        if (existing) {
          meetingPresence.set(participantId, {
            ...existing,
            lastHeartbeat: Date.now(),
          });
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: "invalid action" },
          { status: 400 },
        );
    }

    // Try Redis if available (fire and forget)
    try {
      const { getMeetingRedis } = await import("@/lib/redis");
      const redis = getMeetingRedis(meetingId);
      await redis.heartbeat(participantId, 30);
    } catch {
      // Redis unavailable, already using in-memory
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[presence] Error updating presence:", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 },
    );
  }
}
