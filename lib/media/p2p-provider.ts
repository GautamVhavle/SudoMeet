import type {
  CallParticipant,
  MediaProvider,
  ParticipantCallback,
  TrackChangedCallback,
} from "./types";

/**
 * Tier A media provider — P2P mesh via simple-peer (≤ ~4 participants).
 * Implemented in Phase 7. This stub exists so the abstraction is importable
 * and the provider swap (Phase 11) stays a drop-in replacement.
 */
export class P2PMediaProvider implements MediaProvider {
  async connect(): Promise<void> {
    // TODO(Phase 7): signaling over Upstash Redis SSE, peer wiring.
    throw new Error("P2PMediaProvider is implemented in Phase 7");
  }

  async disconnect(): Promise<void> {
    throw new Error("P2PMediaProvider is implemented in Phase 7");
  }

  async setMicrophoneEnabled(_enabled: boolean): Promise<void> {
    throw new Error("P2PMediaProvider is implemented in Phase 7");
  }

  async setCameraEnabled(_enabled: boolean): Promise<void> {
    throw new Error("P2PMediaProvider is implemented in Phase 7");
  }

  async startScreenShare(): Promise<void> {
    throw new Error("P2PMediaProvider is implemented in Phase 7");
  }

  async stopScreenShare(): Promise<void> {
    throw new Error("P2PMediaProvider is implemented in Phase 7");
  }

  getParticipants(): CallParticipant[] {
    return [];
  }

  onParticipantJoined(_callback: ParticipantCallback): () => void {
    return () => {};
  }

  onParticipantLeft(_callback: ParticipantCallback): () => void {
    return () => {};
  }

  onTrackChanged(_callback: TrackChangedCallback): () => void {
    return () => {};
  }
}
