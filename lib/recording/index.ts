/**
 * Recording module exports.
 */

export type { RecordingStatus, RecordingMetadata, StartRecordingRequest, RecordingState } from "./types";
export { startRecordingEgress, stopRecordingEgress, mapEgressStatus } from "./egress";
export type { EgressConfig, StartEgressResult } from "./egress";
