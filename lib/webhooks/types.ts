/**
 * Webhook event types and payloads.
 * Corresponds to the events listed in implementation-plan.md Phase 13.
 */

export const WEBHOOK_EVENTS = [
  "meeting.started",
  "meeting.ended",
  "participant.joined",
  "participant.left",
  "recording.started",
  "recording.ready",
  "recording.failed",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: unknown;
}

export interface MeetingStartedPayload {
  event: "meeting.started";
  timestamp: string;
  data: {
    meetingId: string;
    roomCode: string;
    title: string;
    startedAt: string;
  };
}

export interface MeetingEndedPayload {
  event: "meeting.ended";
  timestamp: string;
  data: {
    meetingId: string;
    roomCode: string;
    endedAt: string;
    durationSeconds: number;
  };
}

export interface ParticipantJoinedPayload {
  event: "participant.joined";
  timestamp: string;
  data: {
    meetingId: string;
    participantId: string;
    displayName: string;
    joinedAt: string;
  };
}

export interface ParticipantLeftPayload {
  event: "participant.left";
  timestamp: string;
  data: {
    meetingId: string;
    participantId: string;
    displayName: string;
    leftAt: string;
  };
}

export interface RecordingStartedPayload {
  event: "recording.started";
  timestamp: string;
  data: {
    recordingId: string;
    meetingId: string;
    startedAt: string;
  };
}

export interface RecordingReadyPayload {
  event: "recording.ready";
  timestamp: string;
  data: {
    recordingId: string;
    meetingId: string;
    storageKey: string;
    durationSec: number;
    sizeBytes: number;
  };
}

export interface RecordingFailedPayload {
  event: "recording.failed";
  timestamp: string;
  data: {
    recordingId: string;
    meetingId: string;
    error: string;
  };
}
