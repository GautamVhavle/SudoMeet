/**
 * Recording types — LiveKit Egress → R2 lifecycle management.
 *
 * Phase 12: Recording and breakout rooms.
 */

/**
 * Recording lifecycle states.
 * Never assume a recording is ready immediately — use webhooks to update status.
 */
export type RecordingStatus =
  | "REQUESTED"
  | "STARTING"
  | "RECORDING"
  | "STOPPING"
  | "PROCESSING"
  | "READY"
  | "FAILED";

/**
 * Recording metadata stored in database.
 */
export interface RecordingMetadata {
  id: string;
  meetingId: string;
  storageKey: string; // R2 object key (never a raw URL with credentials)
  sizeBytes: bigint | null;
  durationSec: number | null;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
}

/**
 * Recording request parameters.
 */
export interface StartRecordingRequest {
  meetingId: string;
  roomName: string;
}

/**
 * Recording state for runtime tracking.
 */
export interface RecordingState {
  status: RecordingStatus;
  egressId?: string; // LiveKit egress ID for tracking/stopping
  metadata?: RecordingMetadata;
  error?: string;
}
