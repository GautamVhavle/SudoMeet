/**
 * Metrics and observability utilities.
 *
 * Phase 14: Structured logging for operational metrics.
 * Future: Replace with actual metrics collection (Prometheus, Datadog, etc.)
 */

export type MetricType = 
  | "room_created"
  | "room_joined"
  | "room_left"
  | "join_success"
  | "join_failure"
  | "webrtc_failure"
  | "reconnection"
  | "recording_started"
  | "recording_stopped"
  | "recording_failure";

export interface MetricEvent {
  type: MetricType;
  timestamp: number;
  roomId?: string;
  participantId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a metric event for operational tracking.
 * In production, this would send to a metrics backend.
 */
export function trackMetric(event: MetricEvent): void {
  // Structured logging for now — production would push to metrics backend
  console.log(JSON.stringify({
    level: "metric",
    ...event,
  }));
}

/**
 * Track room lifecycle metrics.
 */
export const RoomMetrics = {
  created: (roomId: string) => 
    trackMetric({ type: "room_created", timestamp: Date.now(), roomId }),
  
  joined: (roomId: string, participantId: string) =>
    trackMetric({ type: "room_joined", timestamp: Date.now(), roomId, participantId }),
  
  left: (roomId: string, participantId: string) =>
    trackMetric({ type: "room_left", timestamp: Date.now(), roomId, participantId }),
};

/**
 * Track join success/failure for monitoring join rate.
 */
export const JoinMetrics = {
  success: (roomId: string, participantId: string, joinTime: number) =>
    trackMetric({
      type: "join_success",
      timestamp: Date.now(),
      roomId,
      participantId,
      metadata: { joinTimeMs: joinTime },
    }),
  
  failure: (roomId: string, error: string) =>
    trackMetric({
      type: "join_failure",
      timestamp: Date.now(),
      roomId,
      error,
    }),
};

/**
 * Track WebRTC connection issues.
 */
export const WebRTCMetrics = {
  failure: (roomId: string, participantId: string, error: string) =>
    trackMetric({
      type: "webrtc_failure",
      timestamp: Date.now(),
      roomId,
      participantId,
      error,
    }),
  
  reconnection: (roomId: string, participantId: string) =>
    trackMetric({
      type: "reconnection",
      timestamp: Date.now(),
      roomId,
      participantId,
    }),
};

/**
 * Track recording lifecycle.
 */
export const RecordingMetrics = {
  started: (roomId: string) =>
    trackMetric({ type: "recording_started", timestamp: Date.now(), roomId }),
  
  stopped: (roomId: string) =>
    trackMetric({ type: "recording_stopped", timestamp: Date.now(), roomId }),
  
  failure: (roomId: string, error: string) =>
    trackMetric({
      type: "recording_failure",
      timestamp: Date.now(),
      roomId,
      error,
    }),
};
