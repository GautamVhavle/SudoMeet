/**
 * Breakout room types and state management.
 *
 * Phase 12: Recording and breakout rooms.
 */

/**
 * Breakout room model.
 */
export interface BreakoutRoom {
  id: string;
  meetingId: string;
  name: string;
  /** LiveKit room name for this breakout */
  roomName: string;
  /** Maximum participants (0 = unlimited) */
  capacity: number;
  /** Current participant count */
  participantCount: number;
  createdAt: Date;
}

/**
 * Participant assignment to a breakout room.
 */
export interface BreakoutAssignment {
  participantId: string;
  participantName: string;
  breakoutRoomId: string;
  assignedAt: Date;
}

/**
 * Breakout room creation request.
 */
export interface CreateBreakoutRoomRequest {
  meetingId: string;
  name: string;
  capacity?: number;
}

/**
 * Assign participants to breakout rooms request.
 */
export interface AssignParticipantsRequest {
  meetingId: string;
  assignments: Array<{
    participantId: string;
    breakoutRoomId: string;
  }>;
}

/**
 * Breakout room broadcast message.
 */
export interface BreakoutBroadcast {
  type: "countdown" | "message" | "return";
  payload: {
    seconds?: number; // For countdown
    message?: string; // For broadcast message
  };
}

/**
 * Breakout room state for runtime tracking.
 */
export interface BreakoutRoomState {
  /** All breakout rooms for the meeting */
  rooms: BreakoutRoom[];
  /** Current assignments */
  assignments: BreakoutAssignment[];
  /** Active breakout room (for current participant) */
  activeBreakoutId: string | null;
  /** Countdown timer (seconds remaining) */
  countdownSeconds: number | null;
  /** Last broadcast message */
  lastBroadcast: string | null;
}
