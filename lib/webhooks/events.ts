/**
 * Convenience functions for emitting typed webhook events.
 */

import { emitWebhookEvent } from "./delivery";
import type {
  MeetingEndedPayload,
  MeetingStartedPayload,
  ParticipantJoinedPayload,
  ParticipantLeftPayload,
  RecordingFailedPayload,
  RecordingReadyPayload,
  RecordingStartedPayload,
} from "./types";

export async function emitMeetingStarted(
  data: MeetingStartedPayload["data"]
): Promise<void> {
  await emitWebhookEvent("meeting.started", {
    event: "meeting.started",
    timestamp: new Date().toISOString(),
    data,
  });
}

export async function emitMeetingEnded(
  data: MeetingEndedPayload["data"]
): Promise<void> {
  await emitWebhookEvent("meeting.ended", {
    event: "meeting.ended",
    timestamp: new Date().toISOString(),
    data,
  });
}

export async function emitParticipantJoined(
  data: ParticipantJoinedPayload["data"]
): Promise<void> {
  await emitWebhookEvent("participant.joined", {
    event: "participant.joined",
    timestamp: new Date().toISOString(),
    data,
  });
}

export async function emitParticipantLeft(
  data: ParticipantLeftPayload["data"]
): Promise<void> {
  await emitWebhookEvent("participant.left", {
    event: "participant.left",
    timestamp: new Date().toISOString(),
    data,
  });
}

export async function emitRecordingStarted(
  data: RecordingStartedPayload["data"]
): Promise<void> {
  await emitWebhookEvent("recording.started", {
    event: "recording.started",
    timestamp: new Date().toISOString(),
    data,
  });
}

export async function emitRecordingReady(
  data: RecordingReadyPayload["data"]
): Promise<void> {
  await emitWebhookEvent("recording.ready", {
    event: "recording.ready",
    timestamp: new Date().toISOString(),
    data,
  });
}

export async function emitRecordingFailed(
  data: RecordingFailedPayload["data"]
): Promise<void> {
  await emitWebhookEvent("recording.failed", {
    event: "recording.failed",
    timestamp: new Date().toISOString(),
    data,
  });
}
