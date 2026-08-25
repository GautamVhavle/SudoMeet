/**
 * Tier B LiveKit media provider — implements MediaProvider using LiveKit SFU.
 *
 * Architecture:
 *   - SFU topology: participants connect to a central LiveKit server
 *   - Scales beyond P2P limits (100+ participants)
 *   - LiveKit handles signaling, TURN, media routing internally
 *   - Token-based authentication via /api/livekit/token endpoint
 *
 * See docs/adr/ADR-001-media-provider-abstraction.md and
 * docs/adr/ADR-004-tier-a-p2p-vs-tier-b-livekit.md.
 */

import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
  LocalParticipant,
  createLocalTracks,
  RoomConnectOptions,
  ParticipantEvent,
} from "livekit-client";
import type {
  MediaProvider,
  CallParticipant,
  ParticipantCallback,
  TrackChangedCallback,
} from "@/lib/media/types";
import { MediaStateMachine } from "../state-machine";

export interface LiveKitMediaProviderConfig {
  meetingId: string;
  localParticipantId: string;
  localParticipantName: string;
  livekitUrl: string;
  token: string;
}

/**
 * LiveKit SFU media provider for Tier B calls (100+ participants).
 */
export class LiveKitMediaProvider implements MediaProvider {
  private config: LiveKitMediaProviderConfig;
  private stateMachine = new MediaStateMachine();
  private room: Room | null = null;
  private participants = new Map<string, CallParticipant>();

  // Event callbacks
  private participantJoinedCallbacks = new Set<ParticipantCallback>();
  private participantLeftCallbacks = new Set<ParticipantCallback>();
  private trackChangedCallbacks = new Set<TrackChangedCallback>();

  // Local media state
  private localMicEnabled = true;
  private localCameraEnabled = true;
  private localScreenSharing = false;

  constructor(config: LiveKitMediaProviderConfig) {
    this.config = config;

    // Add local participant placeholder
    this.participants.set(config.localParticipantId, {
      id: config.localParticipantId,
      name: config.localParticipantName,
      isLocal: true,
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
      isScreenSharing: false,
    });
  }

  async connect(): Promise<void> {
    if (this.stateMachine.getState() !== "IDLE") {
      console.warn("[LiveKitMediaProvider] Already connected or connecting");
      return;
    }

    this.stateMachine.transition("REQUESTING_MEDIA");

    try {
      // Create room instance
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
            frameRate: 30,
          },
        },
      });

      // Set up event listeners before connecting
      this.setupRoomEventListeners();

      this.stateMachine.transition("READY");
      this.stateMachine.transition("CONNECTING");

      // Connect to LiveKit room with token
      const connectOptions: RoomConnectOptions = {
        autoSubscribe: true,
      };

      await this.room.connect(this.config.livekitUrl, this.config.token, connectOptions);

      // Acquire local media tracks
      const localTracks = await createLocalTracks({
        audio: true,
        video: true,
      });

      // Publish local tracks
      for (const track of localTracks) {
        await this.room.localParticipant.publishTrack(track);
      }

      // Update local participant with LiveKit identity
      const localParticipant = this.room.localParticipant;
      this.updateLocalParticipant(localParticipant);

      this.stateMachine.transition("CONNECTED");

      console.log("[LiveKitMediaProvider] Connected to room:", this.config.meetingId);
    } catch (error) {
      console.error("[LiveKitMediaProvider] Connection failed:", error);
      this.stateMachine.transition("FAILED");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.room) return;

    try {
      // Stop screen sharing if active
      if (this.localScreenSharing) {
        await this.stopScreenShare();
      }

      // Disconnect from room (automatically unpublishes tracks)
      await this.room.disconnect();
      this.room = null;

      // Clear participants (except local placeholder)
      const localId = this.config.localParticipantId;
      this.participants.forEach((participant) => {
        if (participant.id !== localId) {
          this.participants.delete(participant.id);
        }
      });

      this.stateMachine.transition("DISCONNECTED");
      this.stateMachine.reset();

      console.log("[LiveKitMediaProvider] Disconnected from room");
    } catch (error) {
      console.error("[LiveKitMediaProvider] Disconnect error:", error);
      throw error;
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (!this.room) return;

    const localParticipant = this.room.localParticipant;
    await localParticipant.setMicrophoneEnabled(enabled);

    this.localMicEnabled = enabled;

    // Update local participant
    const local = this.participants.get(this.config.localParticipantId);
    if (local) {
      local.isMicrophoneEnabled = enabled;
    }

    // Notify track change
    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: this.config.localParticipantId,
        track: "audio",
        change: enabled ? "enabled" : "disabled",
      });
    });
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    if (!this.room) return;

    const localParticipant = this.room.localParticipant;
    await localParticipant.setCameraEnabled(enabled);

    this.localCameraEnabled = enabled;

    // Update local participant
    const local = this.participants.get(this.config.localParticipantId);
    if (local) {
      local.isCameraEnabled = enabled;
    }

    // Notify track change
    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: this.config.localParticipantId,
        track: "video",
        change: enabled ? "enabled" : "disabled",
      });
    });
  }

  async startScreenShare(): Promise<void> {
    if (!this.room) {
      throw new Error("Cannot share screen: not connected to room");
    }

    try {
      const localParticipant = this.room.localParticipant;
      await localParticipant.setScreenShareEnabled(true);

      this.localScreenSharing = true;

      // Update local participant
      const local = this.participants.get(this.config.localParticipantId);
      if (local) {
        local.isScreenSharing = true;
      }

      // Notify track change
      this.trackChangedCallbacks.forEach((callback) => {
        callback({
          participantId: this.config.localParticipantId,
          track: "screen",
          change: "started",
        });
      });
    } catch (error) {
      console.error("[LiveKitMediaProvider] Screen share failed:", error);
      throw error;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.room || !this.localScreenSharing) return;

    try {
      const localParticipant = this.room.localParticipant;
      await localParticipant.setScreenShareEnabled(false);

      this.localScreenSharing = false;

      // Update local participant
      const local = this.participants.get(this.config.localParticipantId);
      if (local) {
        local.isScreenSharing = false;
      }

      // Notify track change
      this.trackChangedCallbacks.forEach((callback) => {
        callback({
          participantId: this.config.localParticipantId,
          track: "screen",
          change: "stopped",
        });
      });
    } catch (error) {
      console.error("[LiveKitMediaProvider] Stop screen share failed:", error);
      throw error;
    }
  }

  getParticipants(): CallParticipant[] {
    return Array.from(this.participants.values());
  }

  onParticipantJoined(callback: ParticipantCallback): () => void {
    this.participantJoinedCallbacks.add(callback);
    return () => this.participantJoinedCallbacks.delete(callback);
  }

  onParticipantLeft(callback: ParticipantCallback): () => void {
    this.participantLeftCallbacks.add(callback);
    return () => this.participantLeftCallbacks.delete(callback);
  }

  onTrackChanged(callback: TrackChangedCallback): () => void {
    this.trackChangedCallbacks.add(callback);
    return () => this.trackChangedCallbacks.delete(callback);
  }

  /**
   * Get the LiveKit Room instance for advanced use cases.
   */
  getRoom(): Room | null {
    return this.room;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private setupRoomEventListeners(): void {
    if (!this.room) return;

    // Participant joined
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log("[LiveKitMediaProvider] Participant joined:", participant.identity);
      this.handleParticipantJoined(participant);
    });

    // Participant left
    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log("[LiveKitMediaProvider] Participant left:", participant.identity);
      this.handleParticipantLeft(participant);
    });

    // Track subscribed
    this.room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log(
          "[LiveKitMediaProvider] Track subscribed:",
          track.kind,
          "from",
          participant.identity,
        );
        this.handleTrackSubscribed(track, participant);
      },
    );

    // Track unsubscribed
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log(
          "[LiveKitMediaProvider] Track unsubscribed:",
          track.kind,
          "from",
          participant.identity,
        );
        this.handleTrackUnsubscribed(track, participant);
      },
    );

    // Track muted/unmuted
    this.room.on(RoomEvent.TrackMuted, (publication, participant) => {
      if (participant.isLocal) {
        this.handleLocalTrackMuted(publication.kind);
      } else {
        this.handleRemoteTrackMuted(publication.kind, participant as RemoteParticipant);
      }
    });

    this.room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      if (participant.isLocal) {
        this.handleLocalTrackUnmuted(publication.kind);
      } else {
        this.handleRemoteTrackUnmuted(publication.kind, participant as RemoteParticipant);
      }
    });

    // Reconnection
    this.room.on(RoomEvent.Reconnecting, () => {
      console.log("[LiveKitMediaProvider] Reconnecting...");
      this.stateMachine.transition("RECONNECTING");
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log("[LiveKitMediaProvider] Reconnected");
      this.stateMachine.transition("CONNECTED");
    });

    // Disconnected
    this.room.on(RoomEvent.Disconnected, () => {
      console.log("[LiveKitMediaProvider] Disconnected from room");
      this.stateMachine.transition("DISCONNECTED");
    });
  }

  private updateLocalParticipant(participant: LocalParticipant): void {
    const localParticipant = this.participants.get(this.config.localParticipantId);
    if (localParticipant) {
      localParticipant.isMicrophoneEnabled = participant.isMicrophoneEnabled;
      localParticipant.isCameraEnabled = participant.isCameraEnabled;
    }
  }

  private handleParticipantJoined(participant: RemoteParticipant): void {
    const callParticipant: CallParticipant = {
      id: participant.sid,
      name: participant.name || participant.identity,
      isLocal: false,
      isMicrophoneEnabled: participant.isMicrophoneEnabled,
      isCameraEnabled: participant.isCameraEnabled,
      isScreenSharing: false,
    };

    this.participants.set(participant.sid, callParticipant);

    // Notify subscribers
    this.participantJoinedCallbacks.forEach((callback) => {
      callback(callParticipant);
    });

    // Listen for participant-level track events
    participant.on(ParticipantEvent.IsSpeakingChanged, () => {
      // Could update participant state for speaking indicator
    });
  }

  private handleParticipantLeft(participant: RemoteParticipant): void {
    const callParticipant = this.participants.get(participant.sid);
    if (!callParticipant) return;

    this.participants.delete(participant.sid);

    // Notify subscribers
    this.participantLeftCallbacks.forEach((callback) => {
      callback(callParticipant);
    });
  }

  private handleTrackSubscribed(track: RemoteTrack, participant: RemoteParticipant): void {
    const callParticipant = this.participants.get(participant.sid);
    if (!callParticipant) return;

    // Update participant state based on track type
    if (track.kind === Track.Kind.Audio) {
      callParticipant.isMicrophoneEnabled = !track.isMuted;
    } else if (track.kind === Track.Kind.Video) {
      if (track.source === Track.Source.ScreenShare) {
        callParticipant.isScreenSharing = true;
      } else {
        callParticipant.isCameraEnabled = !track.isMuted;
      }
    }

    // Notify track change
    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: participant.sid,
        track: this.mapLiveKitTrackKind(track),
        change: "started",
      });
    });
  }

  private handleTrackUnsubscribed(track: RemoteTrack, participant: RemoteParticipant): void {
    const callParticipant = this.participants.get(participant.sid);
    if (!callParticipant) return;

    // Update participant state
    if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
      callParticipant.isScreenSharing = false;
    }

    // Notify track change
    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: participant.sid,
        track: this.mapLiveKitTrackKind(track),
        change: "stopped",
      });
    });
  }

  private handleLocalTrackMuted(kind: Track.Kind): void {
    const local = this.participants.get(this.config.localParticipantId);
    if (!local) return;

    if (kind === Track.Kind.Audio) {
      local.isMicrophoneEnabled = false;
    } else if (kind === Track.Kind.Video) {
      local.isCameraEnabled = false;
    }

    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: this.config.localParticipantId,
        track: kind === Track.Kind.Audio ? "audio" : "video",
        change: "disabled",
      });
    });
  }

  private handleLocalTrackUnmuted(kind: Track.Kind): void {
    const local = this.participants.get(this.config.localParticipantId);
    if (!local) return;

    if (kind === Track.Kind.Audio) {
      local.isMicrophoneEnabled = true;
    } else if (kind === Track.Kind.Video) {
      local.isCameraEnabled = true;
    }

    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: this.config.localParticipantId,
        track: kind === Track.Kind.Audio ? "audio" : "video",
        change: "enabled",
      });
    });
  }

  private handleRemoteTrackMuted(kind: Track.Kind, participant: RemoteParticipant): void {
    const callParticipant = this.participants.get(participant.sid);
    if (!callParticipant) return;

    if (kind === Track.Kind.Audio) {
      callParticipant.isMicrophoneEnabled = false;
    } else if (kind === Track.Kind.Video) {
      callParticipant.isCameraEnabled = false;
    }

    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: participant.sid,
        track: kind === Track.Kind.Audio ? "audio" : "video",
        change: "disabled",
      });
    });
  }

  private handleRemoteTrackUnmuted(kind: Track.Kind, participant: RemoteParticipant): void {
    const callParticipant = this.participants.get(participant.sid);
    if (!callParticipant) return;

    if (kind === Track.Kind.Audio) {
      callParticipant.isMicrophoneEnabled = true;
    } else if (kind === Track.Kind.Video) {
      callParticipant.isCameraEnabled = true;
    }

    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: participant.sid,
        track: kind === Track.Kind.Audio ? "audio" : "video",
        change: "enabled",
      });
    });
  }

  private mapLiveKitTrackKind(track: RemoteTrack): "audio" | "video" | "screen" {
    if (track.kind === Track.Kind.Audio) return "audio";
    if (track.source === Track.Source.ScreenShare) return "screen";
    return "video";
  }
}
