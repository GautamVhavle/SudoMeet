/**
 * Media provider abstraction — the seam between the SudoMeet call UI and the
 * underlying media engine.
 *
 * Tier A implements this with `P2PMediaProvider` (simple-peer mesh, ≤4 people).
 * Tier B implements it with `LiveKitMediaProvider` (LiveKit SFU). The UI, call
 * store, chat, participants panel and layouts depend ONLY on these types and
 * must survive the provider swap unchanged.
 *
 * See docs/adr/ADR-001-media-provider-abstraction.md and
 * docs/adr/ADR-004-tier-a-p2p-vs-tier-b-livekit.md.
 */

/** A single track whose state changed inside a call. */
export type MediaTrackKind = "audio" | "video" | "screen";

/** What happened to the track. */
export type MediaTrackChangeKind = "enabled" | "disabled" | "started" | "stopped";

/** Payload for `onTrackChanged` subscribers. */
export interface TrackChangedEvent {
  participantId: string;
  track: MediaTrackKind;
  change: MediaTrackChangeKind;
}

/**
 * WebRTC signaling events for Tier A P2P mesh.
 * Relayed through Redis pub/sub via SSE signaling API.
 *
 * Payload types are `any` to accommodate simple-peer's internal SignalData structure.
 */
/**
 * WebRTC signaling events for Tier A P2P mesh.
 * Relayed through Redis pub/sub via SSE signaling API.
 *
 * Payload types are `any` to accommodate simple-peer's internal SignalData structure.
 */
export type SignalEvent =
  | {
      /** Broadcast on join. Everyone already in the room replies with `peer-ack`. */
      type: "peer-joined";
      peerId: string;
      name?: string;
    }
  | {
      /**
       * Directed reply to a `peer-joined`. Without this a joiner never learns
       * who is already in the room and the mesh stays empty.
       */
      type: "peer-ack";
      from: string;
      to: string;
      name?: string;
      isMicrophoneEnabled?: boolean;
      isCameraEnabled?: boolean;
      isScreenSharing?: boolean;
    }
  | {
      type: "offer";
      from: string;
      to: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: any;
    }
  | {
      type: "answer";
      from: string;
      to: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: any;
    }
  | {
      type: "ice-candidate";
      from: string;
      to: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: any;
    }
  | {
      /** Mic/camera/screen state broadcast so remote tiles stay accurate. */
      type: "peer-state";
      from: string;
      isMicrophoneEnabled: boolean;
      isCameraEnabled: boolean;
      isScreenSharing: boolean;
    }
  | {
      type: "reaction";
      participantId: string;
      participantName: string;
      emoji: string;
      timestamp: number;
    }
  | {
      type: "peer-left";
      peerId: string;
    };


/**
 * Media state machine for connection lifecycle.
 * Applies to both P2P and LiveKit providers.
 */
export type MediaState =
  | "IDLE"
  | "REQUESTING_MEDIA"
  | "READY"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "FAILED";

/**
 * Placeholder participant model (Phase 1).
 * Phases 7/11 extend this with connection quality, joined-at, permissions, etc.
 */
export interface CallParticipant {
  /** Stable id for the participant within the call (local or remote). */
  id: string;
  /** Display name shown on the tile. */
  name: string;
  /** True for the local user's own participant entry. */
  isLocal: boolean;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  /** Peer connection health, used by the tile's connection badge. */
  connectionState?: "connecting" | "connected" | "reconnecting" | "failed";
}

export type ParticipantCallback = (participant: CallParticipant) => void;
export type TrackChangedCallback = (event: TrackChangedEvent) => void;

/**
 * WebRTC connection statistics for observability overlay (Phase 14).
 */
export interface WebRTCStats {
  /** Video/audio bitrate (e.g., "1.2 Mbps"). */
  bitrate?: string;
  /** Packet loss percentage (e.g., "0.5%"). */
  packetLoss?: string;
  /** Jitter in milliseconds (e.g., "12ms"). */
  jitter?: string;
  /** Round-trip time in milliseconds (e.g., "45ms"). */
  rtt?: string;
  /** Latency in milliseconds (alias for RTT, e.g., "45ms"). */
  latency?: string;
  /** Video codec being used (e.g., "VP8", "H264"). */
  codec?: string;
  /** Video resolution (e.g., "1280×720"). */
  resolution?: string;
  /** Frames per second (e.g., 30). */
  fps?: number;
  /** Connection type (e.g., "relay", "host", "srflx"). */
  connectionType?: string;
  /** SFU node identifier (LiveKit only). */
  sfuNode?: string;
}

/**
 * The contract every media engine must fulfill. The call UI talks exclusively
 * to this interface — never to simple-peer or livekit-client directly.
 */
export interface MediaProvider {
  /** Join the call room and establish the underlying connections. */
  connect(): Promise<void>;

  /** Leave the call room and release all media resources. */
  disconnect(): Promise<void>;

  /** Mute/unmute the local microphone. */
  setMicrophoneEnabled(enabled: boolean): Promise<void>;

  /** Turn the local camera on/off. */
  setCameraEnabled(enabled: boolean): Promise<void>;

  /** Begin sharing the local screen. */
  startScreenShare(): Promise<void>;

  /** Stop sharing the local screen. */
  stopScreenShare(): Promise<void>;

  /** Snapshot of everyone currently in the call. */
  getParticipants(): CallParticipant[];

  /** Get WebRTC statistics for the stats overlay (Phase 14). */
  getStats(): Promise<WebRTCStats>;

  /** Subscribe to remote/local participants joining. Returns unsubscribe fn. */
  onParticipantJoined(callback: ParticipantCallback): () => void;

  /** Subscribe to participants leaving. Returns unsubscribe fn. */
  onParticipantLeft(callback: ParticipantCallback): () => void;

  /** Subscribe to track state changes (mic/camera/screen). Returns unsubscribe fn. */
  onTrackChanged(callback: TrackChangedCallback): () => void;
}
