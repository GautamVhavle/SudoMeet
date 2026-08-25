/**
 * Presence system with heartbeat + TTL for tracking who's in the room.
 *
 * NEVER rely on `beforeunload` alone — it's unreliable on mobile and across
 * browsers. Instead:
 * - Heartbeat every N seconds to refresh TTL
 * - Redis TTL automatically cleans up stale entries
 * - Explicit disconnect cleanup on graceful leave
 *
 * Presence data stored in Redis with structure:
 * {
 *   participantId: string
 *   meetingId: string
 *   displayName: string
 *   role: "host" | "guest"
 *   joinedAt: number (timestamp)
 *   lastHeartbeat: number (timestamp)
 *   connectionState: "connected" | "reconnecting" | "disconnected"
 *   isMicrophoneEnabled: boolean
 *   isCameraEnabled: boolean
 *   isScreenSharing: boolean
 *   handRaised: boolean
 * }
 */

import { getMeetingRedis } from "@/lib/redis";

export interface PresenceData {
  participantId: string;
  meetingId: string;
  displayName: string;
  role: "host" | "guest";
  joinedAt: number;
  lastHeartbeat: number;
  connectionState: "connected" | "reconnecting" | "disconnected";
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
}

const PRESENCE_TTL_SECONDS = 30; // Presence expires after 30 seconds without heartbeat
const HEARTBEAT_INTERVAL_MS = 10000; // Send heartbeat every 10 seconds

/**
 * Set or update presence for a participant in a meeting.
 * Automatically sets TTL so stale entries clean themselves up.
 */
export async function setPresence(
  meetingId: string,
  data: PresenceData,
): Promise<void> {
  const redis = getMeetingRedis(meetingId);

  const presencePayload = {
    ...data,
    lastHeartbeat: Date.now(),
  };

  await redis.setPresence(data.participantId, PRESENCE_TTL_SECONDS);
  // Store the full presence data in a hash
  await fetch(`/api/presence/${meetingId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "set", participantId: data.participantId, data: presencePayload }),
  });
}

/**
 * Send heartbeat to refresh TTL for a participant.
 */
export async function sendHeartbeat(
  meetingId: string,
  participantId: string,
): Promise<void> {
  const redis = getMeetingRedis(meetingId);
  await redis.heartbeat(participantId, PRESENCE_TTL_SECONDS);
}

/**
 * Get all active participants in a meeting (those with valid TTL).
 */
export async function getActiveParticipants(
  meetingId: string,
): Promise<PresenceData[]> {
  try {
    const response = await fetch(`/api/presence/${meetingId}`);
    if (!response.ok) {
      console.warn("[presence] Failed to fetch participants:", response.status);
      return [];
    }
    const data = await response.json();
    return data.participants || [];
  } catch (error) {
    console.error("[presence] Error fetching participants:", error);
    return [];
  }
}

/**
 * Remove a participant from presence (explicit disconnect).
 */
export async function removePresence(
  meetingId: string,
  participantId: string,
): Promise<void> {
  try {
    await fetch(`/api/presence/${meetingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", participantId }),
    });
  } catch (error) {
    console.error("[presence] Error removing presence:", error);
  }
}

/**
 * Update specific presence fields (e.g., mute/video state, hand raise).
 */
export async function updatePresenceState(
  meetingId: string,
  participantId: string,
  updates: Partial<Pick<PresenceData, 
    "isMicrophoneEnabled" | 
    "isCameraEnabled" | 
    "isScreenSharing" | 
    "handRaised" | 
    "connectionState"
  >>,
): Promise<void> {
  try {
    await fetch(`/api/presence/${meetingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "update", 
        participantId, 
        updates 
      }),
    });
  } catch (error) {
    console.error("[presence] Error updating presence state:", error);
  }
}

export { PRESENCE_TTL_SECONDS, HEARTBEAT_INTERVAL_MS };
