/**
 * Tier A P2P media provider — implements MediaProvider using simple-peer mesh.
 *
 * Architecture:
 *   - Mesh topology: each participant maintains a direct WebRTC connection to every other participant
 *   - Max ~4 participants (N*(N-1)/2 connections grows quickly)
 *   - Signaling via Redis pub/sub (relayed through SSE API)
 *   - Local media acquired once, shared across all peer connections
 *
 * See docs/adr/ADR-001-media-provider-abstraction.md and
 * docs/adr/ADR-004-tier-a-p2p-vs-tier-b-livekit.md.
 */

import type {
  MediaProvider,
  CallParticipant,
  ParticipantCallback,
  TrackChangedCallback,
  SignalEvent,
} from "@/lib/media/types";
import { MediaStateMachine } from "../state-machine";
import { PeerConnection } from "./peer-connection";

export interface P2PMediaProviderConfig {
  meetingId: string;
  localParticipantId: string;
  localParticipantName: string;
  onSignalEvent: (event: SignalEvent) => void;
}

/**
 * P2P mesh media provider for Tier A calls (≤4 participants).
 */
export class P2PMediaProvider implements MediaProvider {
  private config: P2PMediaProviderConfig;
  private stateMachine = new MediaStateMachine();
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, PeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private participants = new Map<string, CallParticipant>();

  // Event callbacks
  private participantJoinedCallbacks = new Set<ParticipantCallback>();
  private participantLeftCallbacks = new Set<ParticipantCallback>();
  private trackChangedCallbacks = new Set<TrackChangedCallback>();

  // Local media state
  private localMicEnabled = true;
  private localCameraEnabled = true;
  private localScreenSharing = false;

  constructor(config: P2PMediaProviderConfig) {
    this.config = config;

    // Add local participant
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
      console.warn("[P2PMediaProvider] Already connected or connecting");
      return;
    }

    this.stateMachine.transition("REQUESTING_MEDIA");

    try {
      // Request local media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      this.stateMachine.transition("READY");
      this.stateMachine.transition("CONNECTING");

      // Announce presence to the room
      this.config.onSignalEvent({
        type: "peer-joined",
        peerId: this.config.localParticipantId,
      });

      this.stateMachine.transition("CONNECTED");
    } catch (error) {
      console.error("[P2PMediaProvider] Failed to acquire media:", error);
      this.stateMachine.transition("FAILED");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Announce departure
    this.config.onSignalEvent({
      type: "peer-left",
      peerId: this.config.localParticipantId,
    });

    // Close all peer connections
    this.peerConnections.forEach((peer) => peer.close());
    this.peerConnections.clear();

    // Stop local media
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Clear remote streams
    this.remoteStreams.clear();

    // Clear participants (except local)
    const localId = this.config.localParticipantId;
    this.participants.forEach((participant) => {
      if (participant.id !== localId) {
        this.participants.delete(participant.id);
      }
    });

    this.stateMachine.transition("DISCONNECTED");
    this.stateMachine.reset();
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (!this.localStream) return;

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });

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
    if (!this.localStream) return;

    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });

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
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        // Request system audio where supported (Chrome/Edge)
        // @ts-expect-error - displaySurface is non-standard but supported in Chrome/Edge
        audio: { suppressLocalAudioPlayback: false },
      });

      // Listen for external stop (user clicks browser's "Stop sharing" button)
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener("ended", () => {
          // Browser stopped sharing externally, clean up
          this.stopScreenShare().catch((err) => {
            console.error("[P2PMediaProvider] Failed to clean up after external stop:", err);
          });
        });
      }

      // Replace video track in all peer connections
      this.peerConnections.forEach((peer) => {
        peer.replaceStream(screenStream);
      });

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
      console.error("[P2PMediaProvider] Screen share failed:", error);
      throw error;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.localStream || !this.localScreenSharing) return;

    // Restore original camera stream
    this.peerConnections.forEach((peer) => {
      peer.replaceStream(this.localStream!);
    });

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
   * Handle incoming signaling events from other peers.
   */
  handleSignalEvent(event: SignalEvent): void {
    switch (event.type) {
      case "peer-joined":
        this.handlePeerJoined(event.peerId);
        break;
      case "offer":
        this.handleOffer(event.from, event.payload);
        break;
      case "answer":
        this.handleAnswer(event.from, event.payload);
        break;
      case "ice-candidate":
        this.handleIceCandidate(event.from, event.payload);
        break;
      case "peer-left":
        this.handlePeerLeft(event.peerId);
        break;
    }
  }

  /**
   * Get the local media stream for rendering.
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get a remote participant's stream.
   */
  getRemoteStream(participantId: string): MediaStream | null {
    return this.remoteStreams.get(participantId) || null;
  }

  private handlePeerJoined(peerId: string): void {
    // Don't connect to ourselves
    if (peerId === this.config.localParticipantId) return;

    // Skip if already connected
    if (this.peerConnections.has(peerId)) {
      console.warn(`[P2PMediaProvider] Already connected to ${peerId}`);
      return;
    }

    // Only initiate if our ID is lexicographically greater (prevents duplicate connections)
    const shouldInitiate = this.config.localParticipantId > peerId;

    if (!this.localStream) {
      console.warn("[P2PMediaProvider] No local stream to share");
      return;
    }

    // Create peer connection
    const peer = new PeerConnection(peerId, {
      onSignal: (signal) => {
        // simple-peer signal data structure
        const isOffer = signal.type === "offer";
        const isAnswer = signal.type === "answer";

        if (isOffer || isAnswer) {
          // SDP offer/answer
          this.config.onSignalEvent({
            type: signal.type,
            from: this.config.localParticipantId,
            to: peerId,
            payload: signal,
          });
        } else {
          // ICE candidate
          this.config.onSignalEvent({
            type: "ice-candidate",
            from: this.config.localParticipantId,
            to: peerId,
            payload: signal,
          });
        }
      },
      onStream: (stream) => {
        this.remoteStreams.set(peerId, stream);

        // Add remote participant
        const participant: CallParticipant = {
          id: peerId,
          name: `Peer ${peerId.slice(0, 8)}`,
          isLocal: false,
          isMicrophoneEnabled: stream.getAudioTracks().some((t) => t.enabled),
          isCameraEnabled: stream.getVideoTracks().some((t) => t.enabled),
          isScreenSharing: false,
        };

        this.participants.set(peerId, participant);
        this.participantJoinedCallbacks.forEach((callback) => callback(participant));
      },
      onStateChange: (state) => {
        console.log(`[P2PMediaProvider] Peer ${peerId} state: ${state}`);
      },
      onError: (error) => {
        console.error(`[P2PMediaProvider] Peer ${peerId} error:`, error);
        this.handlePeerLeft(peerId);
      },
    });

    this.peerConnections.set(peerId, peer);

    if (shouldInitiate) {
      peer.initiate(this.localStream);
    } else {
      peer.receive(this.localStream);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleOffer(from: string, payload: any): void {
    // Ignore offers from ourselves
    if (from === this.config.localParticipantId) return;

    const peer = this.peerConnections.get(from);
    if (!peer) {
      console.warn(`[P2PMediaProvider] Received offer from unknown peer ${from}`);
      return;
    }

    peer.handleSignal(payload);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleAnswer(from: string, payload: any): void {
    // Ignore answers from ourselves
    if (from === this.config.localParticipantId) return;

    const peer = this.peerConnections.get(from);
    if (!peer) {
      console.warn(`[P2PMediaProvider] Received answer from unknown peer ${from}`);
      return;
    }

    peer.handleSignal(payload);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleIceCandidate(from: string, payload: any): void {
    // Ignore ICE candidates from ourselves
    if (from === this.config.localParticipantId) return;

    const peer = this.peerConnections.get(from);
    if (!peer) {
      console.warn(`[P2PMediaProvider] Received ICE candidate from unknown peer ${from}`);
      return;
    }

    peer.handleSignal(payload);
  }

  private handlePeerLeft(peerId: string): void {
    const peer = this.peerConnections.get(peerId);
    if (peer) {
      peer.close();
      this.peerConnections.delete(peerId);
    }

    this.remoteStreams.delete(peerId);

    const participant = this.participants.get(peerId);
    if (participant) {
      this.participants.delete(peerId);
      this.participantLeftCallbacks.forEach((callback) => callback(participant));
    }
  }
}
