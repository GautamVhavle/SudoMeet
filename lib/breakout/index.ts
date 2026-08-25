/**
 * Breakout room module exports.
 */

export type {
  BreakoutRoom,
  BreakoutAssignment,
  CreateBreakoutRoomRequest,
  AssignParticipantsRequest,
  BreakoutBroadcast,
  BreakoutRoomState,
} from "./types";

export {
  createBreakoutRoom,
  assignParticipants,
  broadcastToBreakouts,
  returnAllToMainRoom,
  getBreakoutRooms,
  getBreakoutAssignments,
} from "./logic";
