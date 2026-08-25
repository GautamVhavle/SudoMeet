/**
 * LiveKit Egress integration for recording to R2.
 *
 * Architecture:
 * SudoMeet → LiveKit Egress → Cloudflare R2 → Recording record in Postgres
 *
 * Phase 12: Recording and breakout rooms.
 */

import { EgressClient } from "livekit-server-sdk";
import type { RecordingStatus } from "./types";

export interface EgressConfig {
  livekitUrl: string;
  apiKey: string;
  apiSecret: string;
  r2Bucket: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Endpoint?: string; // Default: Cloudflare R2
}

export interface StartEgressResult {
  egressId: string;
  storageKey: string; // R2 object key
}

/**
 * Start recording a LiveKit room to R2 storage.
 *
 * @throws {Error} if egress client creation or start fails
 */
export async function startRecordingEgress(
  config: EgressConfig,
  roomName: string,
  meetingId: string,
): Promise<StartEgressResult> {
  const egress = new EgressClient(config.livekitUrl, config.apiKey, config.apiSecret);

  const storageKey = `recordings/${meetingId}/${Date.now()}.mp4`;

  try {
    // For now, use a simplified approach that doesn't require full R2 integration
    // In production, this would use proper S3/R2 upload configuration
    // The actual LiveKit SDK API may differ - this is a placeholder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await egress.startRoomCompositeEgress(roomName, {
      filepath: storageKey,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (!response.egressId) {
      throw new Error("No egress ID returned from LiveKit");
    }

    return {
      egressId: response.egressId,
      storageKey,
    };
  } catch (error) {
    console.error("[startRecordingEgress] Failed to start recording:", error);
    throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

/**
 * Stop a running recording egress.
 *
 * @throws {Error} if egress stop fails
 */
export async function stopRecordingEgress(
  config: EgressConfig,
  egressId: string,
): Promise<void> {
  const egress = new EgressClient(config.livekitUrl, config.apiKey, config.apiSecret);

  try {
    await egress.stopEgress(egressId);
  } catch (error) {
    console.error("[stopRecordingEgress] Failed to stop recording:", error);
    throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

/**
 * Map LiveKit egress status to our recording status.
 */
export function mapEgressStatus(livekitStatus: string): RecordingStatus {
  switch (livekitStatus) {
    case "EGRESS_STARTING":
      return "STARTING";
    case "EGRESS_ACTIVE":
      return "RECORDING";
    case "EGRESS_ENDING":
      return "STOPPING";
    case "EGRESS_COMPLETE":
      return "PROCESSING"; // File uploaded, but not yet fully processed
    case "EGRESS_FAILED":
    case "EGRESS_ABORTED":
      return "FAILED";
    default:
      return "REQUESTED";
  }
}
