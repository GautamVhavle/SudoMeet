/**
 * Breakout room business logic.
 *
 * Features:
 * - Create breakout rooms
 * - Assign participants to rooms
 * - Broadcast messages to all breakouts
 * - Return everyone to main room
 * - Rejoin handling
 *
 * Phase 12: Recording and breakout rooms.
 */

import type {
  BreakoutRoom,
  BreakoutAssignment,
  CreateBreakoutRoomRequest,
  AssignParticipantsRequest,
  BreakoutBroadcast,
} from "./types";

/**
 * Create a new breakout room within a meeting.
 */
export async function createBreakoutRoom(
  request: CreateBreakoutRoomRequest,
): Promise<BreakoutRoom> {
  const { meetingId, name, capacity = 0 } = request;

  // Generate a unique room name for LiveKit
  const roomName = `${meetingId}-breakout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // For now, we'll store breakout rooms in memory or extend the Meeting model
  // Since the schema doesn't have a BreakoutRoom table yet, we'll return a mock
  // In production, add a BreakoutRoom model to schema.prisma

  const breakoutRoom: BreakoutRoom = {
    id: `br_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    meetingId,
    name,
    roomName,
    capacity,
    participantCount: 0,
    createdAt: new Date(),
  };

  // TODO: Persist to database when BreakoutRoom model is added
  console.log("[createBreakoutRoom] Created breakout room:", breakoutRoom);

  return breakoutRoom;
}

/**
 * Assign participants to breakout rooms.
 */
export async function assignParticipants(
  request: AssignParticipantsRequest,
): Promise<BreakoutAssignment[]> {
  const { assignments } = request;

  const breakoutAssignments: BreakoutAssignment[] = assignments.map((a) => ({
    participantId: a.participantId,
    participantName: `Participant ${a.participantId}`, // TODO: Fetch from Participant model
    breakoutRoomId: a.breakoutRoomId,
    assignedAt: new Date(),
  }));

  // TODO: Persist assignments to database
  console.log("[assignParticipants] Assigned participants:", breakoutAssignments);

  return breakoutAssignments;
}

/**
 * Broadcast a message to all breakout rooms.
 */
export async function broadcastToBreakouts(
  meetingId: string,
  broadcast: BreakoutBroadcast,
): Promise<void> {
  // In production, use Redis pub/sub or LiveKit data messages
  console.log(`[broadcastToBreakouts] Broadcasting to ${meetingId}:`, broadcast);

  // TODO: Implement via Redis pub/sub or LiveKit data channel
}

/**
 * Return all participants from breakout rooms to main room.
 */
export async function returnAllToMainRoom(meetingId: string): Promise<void> {
  console.log(`[returnAllToMainRoom] Returning all participants to main room: ${meetingId}`);

  // Broadcast "return" message to all breakouts
  await broadcastToBreakouts(meetingId, {
    type: "return",
    payload: {},
  });

  // TODO: Clear all assignments in database
}

/**
 * Get all breakout rooms for a meeting.
 */
export async function getBreakoutRooms(meetingId: string): Promise<BreakoutRoom[]> {
  // TODO: Query from database when BreakoutRoom model is added
  console.log(`[getBreakoutRooms] Fetching breakout rooms for meeting: ${meetingId}`);
  return [];
}

/**
 * Get breakout room assignments for a meeting.
 */
export async function getBreakoutAssignments(
  meetingId: string,
): Promise<BreakoutAssignment[]> {
  // TODO: Query from database when assignment tracking is added
  console.log(`[getBreakoutAssignments] Fetching assignments for meeting: ${meetingId}`);
  return [];
}
