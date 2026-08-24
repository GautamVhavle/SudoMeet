import type {
  CallParticipant,
  MediaProvider,
  ParticipantCallback,
  TrackChangedCallback,
} from "./types";

/**
 * Tier B media provider — LiveKit SFU for Meet-scale rooms.
 * Implemented in Phase 11 behind the same MediaProvider interface; the UI and
 * call store must not change when this becomes the active provider.
 */
export class LiveKitMediaProvider implements MediaProvider {
  async connect(): Promise<void> {
    // TODO(Phase 11): livekit-client room join with token from Route Handler.
    throw new Error("LiveKitMediaProvider is implemented in Phase 11");
  }

  async disconnect(): Promise<void> {
    throw new Error("LiveKitMediaProvider is implemented in Phase 11");
  }

  async setMicrophoneEnabled(_enabled: boolean): Promise<void> {
    throw new Error("LiveKitMediaProvider is implemented in Phase 11");
  }

  async setCameraEnabled(_enabled: boolean): Promise<void> {
    throw new Error("LiveKitMediaProvider is implemented in Phase 11");
  }

  async startScreenShare(): Promise<void> {
    throw new Error("LiveKitMediaProvider is implemented in LiveKit phase");
  }

  async stopScreenShare(): Promise<void> {
    throw new Error("LiveKitMediaProvider is implemented in Phase 11");
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
