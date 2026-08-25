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
  /** Notified whenever a remote stream is attached or replaced. */
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  /** Preferred input devices, from the lobby / settings dialog. */
  audioDeviceId?: string | null;
  videoDeviceId?: string | null;
  /** Start with mic/camera off (lobby toggles). */
  startMuted?: boolean;
  startCameraOff?: boolean;
}

function buildConstraints(
  audioDeviceId?: string | null,
  videoDeviceId?: string | null,
): MediaStreamConstraints {
  return {
    audio: {
      ...(audioDeviceId ? { deviceId: { exact: audioDeviceId } } : {}),
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: {
      ...(videoDeviceId ? { deviceId: { exact: videoDeviceId } } : {}),
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  };
}

/**
 * P2P mesh media provider for Tier A calls (≤4 people).
 */
export class P2PMediaProvider implements MediaProvider {
  private config: P2PMediaProviderConfig;
  private stateMachine = new MediaStateMachine();
  private localStream: MediaStream | null = null;
  private cameraStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
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
    this.localMicEnabled = !config.startMuted;
    this.localCameraEnabled = !config.startCameraOff;

    // Add local participant
    this.participants.set(config.localParticipantId, {
      id: config.localParticipantId,
      name: config.localParticipantName,
      isLocal: true,
      isMicrophoneEnabled: this.localMicEnabled,
      isCameraEnabled: this.localCameraEnabled,
      isScreenSharing: false,
      connectionState: "connected",
    });
  }

  /**
   * Acquire local media only. Split out from connect() so the UI can show a
   * self-preview (and surface permission errors) before any signalling starts.
   */
  async acquireMedia(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;

    this.stateMachine.transition("REQUESTING_MEDIA");

    const { audioDeviceId, videoDeviceId } = this.config;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(
        buildConstraints(audioDeviceId, videoDeviceId),
      );
    } catch (error) {
      // A missing/busy camera must not take the whole call down — fall back to
      // audio-only, then to a silent placeholder, so the user still joins.
      console.warn("[P2PMediaProvider] Full media failed, trying audio-only:", error);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
          video: false,
        });
        this.localCameraEnabled = false;
      } catch (audioError) {
        this.stateMachine.transition("FAILED");
        throw audioError;
      }
    }

    this.localStream = stream;
    this.cameraStream = stream;

    // Apply the lobby's mute/camera choices to the freshly acquired tracks.
    stream.getAudioTracks().forEach((t) => (t.enabled = this.localMicEnabled));
    stream.getVideoTracks().forEach((t) => (t.enabled = this.localCameraEnabled));

    const local = this.participants.get(this.config.localParticipantId);
    if (local) {
      local.isMicrophoneEnabled =
        this.localMicEnabled && stream.getAudioTracks().length > 0;
      local.isCameraEnabled =
        this.localCameraEnabled && stream.getVideoTracks().length > 0;
    }

    this.stateMachine.transition("READY");
    return stream;
  }

  async connect(): Promise<void> {
    const state = this.stateMachine.getState();
    if (state === "CONNECTED" || state === "CONNECTING") return;

    await this.acquireMedia();

    this.stateMachine.transition("CONNECTING");

    // Announce ourselves. Everyone already in the room replies with peer-ack,
    // which is how we discover peers that joined before us.
    this.config.onSignalEvent({
      type: "peer-joined",
      peerId: this.config.localParticipantId,
      name: this.config.localParticipantName,
    });

    this.stateMachine.transition("CONNECTED");
  }

  /** Re-announce presence, e.g. after the SSE stream reconnects. */
  announce(): void {
    if (!this.localStream) return;
    this.config.onSignalEvent({
      type: "peer-joined",
      peerId: this.config.localParticipantId,
      name: this.config.localParticipantName,
    });
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

    // Stop every local track (camera and any active screen share)
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.screenStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.cameraStream = null;
    this.screenStream = null;
    this.localScreenSharing = false;

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
    this.localMicEnabled = enabled;

    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });

    const local = this.participants.get(this.config.localParticipantId);
    if (local) {
      local.isMicrophoneEnabled = enabled;
    }

    // Track.enabled=false sends silence but doesn't fire a remote mute event,
    // so state has to be broadcast explicitly for other tiles to update.
    this.broadcastLocalState();

    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: this.config.localParticipantId,
        track: "audio",
        change: enabled ? "enabled" : "disabled",
      });
    });
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    this.localCameraEnabled = enabled;

    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });

    const local = this.participants.get(this.config.localParticipantId);
    if (local) {
      local.isCameraEnabled = enabled;
    }

    this.broadcastLocalState();

    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: this.config.localParticipantId,
        track: "video",
        change: enabled ? "enabled" : "disabled",
      });
    });
  }

  /** Swap input devices mid-call without dropping peer connections. */
  async switchDevices(options: {
    audioDeviceId?: string | null;
    videoDeviceId?: string | null;
  }): Promise<MediaStream | null> {
    const audioDeviceId = options.audioDeviceId ?? this.config.audioDeviceId;
    const videoDeviceId = options.videoDeviceId ?? this.config.videoDeviceId;

    const next = await navigator.mediaDevices.getUserMedia(
      buildConstraints(audioDeviceId, videoDeviceId),
    );

    next.getAudioTracks().forEach((t) => (t.enabled = this.localMicEnabled));
    next.getVideoTracks().forEach((t) => (t.enabled = this.localCameraEnabled));

    // Only push new tracks to peers if we're not currently screen sharing,
    // otherwise we'd clobber the shared surface.
    if (!this.localScreenSharing) {
      this.peerConnections.forEach((peer) => peer.replaceStream(next));
    }

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = next;
    this.cameraStream = next;
    this.config.audioDeviceId = audioDeviceId;
    this.config.videoDeviceId = videoDeviceId;

    return next;
  }

  async startScreenShare(): Promise<void> {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    this.screenStream = screenStream;

    // Browser's own "Stop sharing" button ends the track directly.
    const videoTrack = screenStream.getVideoTracks()[0];
    videoTrack?.addEventListener("ended", () => {
      this.stopScreenShare().catch((err) => {
        console.error("[P2PMediaProvider] Failed to clean up after external stop:", err);
      });
    });

    this.peerConnections.forEach((peer) => peer.replaceStream(screenStream));

    this.localScreenSharing = true;

    const local = this.participants.get(this.config.localParticipantId);
    if (local) {
      local.isScreenSharing = true;
    }

    this.broadcastLocalState();

    this.trackChangedCallbacks.forEach((callback) => {
      callback({
        participantId: this.config.localParticipantId,
        track: "screen",
        change: "started",
      });
    });
  }

  async stopScreenShare(): Promise<void> {
    if (!this.localScreenSharing) return;

    this.screenStream?.getTracks().forEach((track) => track.stop());
    this.screenStream = null;

    // Restore the camera track on every peer.
    if (this.cameraStream) {
      this.peerConnections.forEach((peer) => peer.replaceStream(this.cameraStream!));
      this.localStream = this.cameraStream;
    }

    this.localScreenSharing = false;

    const local = this.participants.get(this.config.localParticipantId);
    if (local) {
      local.isScreenSharing = false;
    }

    this.broadcastLocalState();

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
   * Get WebRTC statistics for the stats overlay (Phase 14).
   * Aggregates stats from all active peer connections.
   */
  async getStats(): Promise<import("@/lib/media/types").WebRTCStats> {
    const stats: import("@/lib/media/types").WebRTCStats = {};

    // Get stats from first active peer connection
    const activePeer = Array.from(this.peerConnections.values())[0];
    if (!activePeer) return stats;

    const report = await activePeer.getStats();
    if (!report) return stats;

    let totalBitrate = 0;
    let totalPacketLoss = 0;
    let maxRtt = 0;
    let codec = "";
    let resolution = "";
    let fps = 0;
    let connectionType = "";

    // Parse RTCStatsReport
    report.forEach((stat) => {
      // Inbound RTP (receiving)
      if (stat.type === "inbound-rtp" && stat.mediaType === "video") {
        // Calculate bitrate
        if (stat.bytesReceived && stat.timestamp) {
          totalBitrate += (stat.bytesReceived * 8) / 1000000; // Convert to Mbps
        }

        // Packet loss
        if (stat.packetsLost && stat.packetsReceived) {
          const total = stat.packetsLost + stat.packetsReceived;
          totalPacketLoss += (stat.packetsLost / total) * 100;
        }

        // Codec
        if (stat.codecId) {
          const codecStat = report.get(stat.codecId);
          if (codecStat && codecStat.mimeType) {
            codec = codecStat.mimeType.split("/")[1] || "";
          }
        }

        // Resolution & FPS
        if (stat.frameWidth && stat.frameHeight) {
          resolution = `${stat.frameWidth}×${stat.frameHeight}`;
        }
        if (stat.framesPerSecond) {
          fps = stat.framesPerSecond;
        }
      }

      // Candidate pair (connection type & RTT)
      if (stat.type === "candidate-pair" && stat.state === "succeeded") {
        if (stat.currentRoundTripTime) {
          maxRtt = Math.max(maxRtt, stat.currentRoundTripTime * 1000); // Convert to ms
        }

        // Get local candidate for connection type
        if (stat.localCandidateId) {
          const localCandidate = report.get(stat.localCandidateId);
          if (localCandidate && localCandidate.candidateType) {
            connectionType = localCandidate.candidateType;
          }
        }
      }
    });

    // Format stats
    if (totalBitrate > 0) {
      stats.bitrate = `${totalBitrate.toFixed(1)} Mbps`;
    }
    if (totalPacketLoss > 0) {
      stats.packetLoss = `${totalPacketLoss.toFixed(2)}%`;
    }
    if (maxRtt > 0) {
      stats.rtt = `${Math.round(maxRtt)}ms`;
      stats.latency = `${Math.round(maxRtt)}ms`;
    }
    if (codec) {
      stats.codec = codec;
    }
    if (resolution) {
      stats.resolution = resolution;
    }
    if (fps > 0) {
      stats.fps = fps;
    }
    if (connectionType) {
      stats.connectionType = connectionType;
    }

    return stats;
  }

  /**
   * Handle incoming signaling events from other peers.
   */
  handleSignalEvent(event: SignalEvent): void {
    switch (event.type) {
      case "peer-joined":
        this.handlePeerJoined(event.peerId, event.name);
        break;
      case "peer-ack":
        // Directed reply — ignore acks meant for someone else.
        if (event.to !== this.config.localParticipantId) return;
        this.handlePeerAck(event.from, event.name);
        break;
      case "offer":
        if (event.to !== this.config.localParticipantId) return;
        this.handleOffer(event.from, event.payload);
        break;
      case "answer":
        if (event.to !== this.config.localParticipantId) return;
        this.handleAnswer(event.from, event.payload);
        break;
      case "ice-candidate":
        if (event.to !== this.config.localParticipantId) return;
        this.handleIceCandidate(event.from, event.payload);
        break;
      case "peer-state":
        this.handlePeerState(event.from, event);
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

  private handlePeerJoined(peerId: string, name?: string): void {
    if (peerId === this.config.localParticipantId) return;

    // Reply so the newcomer learns we exist. Without this ack the joiner has no
    // idea who is already in the room and the mesh never forms.
    this.config.onSignalEvent({
      type: "peer-ack",
      from: this.config.localParticipantId,
      to: peerId,
      name: this.config.localParticipantName,
      isMicrophoneEnabled: this.localMicEnabled,
      isCameraEnabled: this.localCameraEnabled,
      isScreenSharing: this.localScreenSharing,
    });

    this.ensurePeer(peerId, name);
  }

  private handlePeerAck(from: string, name?: string): void {
    if (from === this.config.localParticipantId) return;
    this.ensurePeer(from, name);
  }

  /**
   * Create the peer connection for `peerId` if we don't already have one.
   *
   * Exactly one side initiates, chosen by comparing ids, so both peers agree on
   * roles no matter which order the join/ack pair arrives in.
   */
  private ensurePeer(peerId: string, name?: string): PeerConnection | null {
    this.upsertRemoteParticipant(peerId, name);

    const existing = this.peerConnections.get(peerId);
    if (existing) return existing;

    if (!this.localStream) {
      console.warn("[P2PMediaProvider] No local stream yet; deferring peer setup");
      return null;
    }

    const shouldInitiate = this.config.localParticipantId > peerId;

    const peer = new PeerConnection(peerId, {
      onSignal: (signal) => {
        const type =
          signal?.type === "offer"
            ? "offer"
            : signal?.type === "answer"
              ? "answer"
              : "ice-candidate";

        this.config.onSignalEvent({
          type,
          from: this.config.localParticipantId,
          to: peerId,
          payload: signal,
        } as SignalEvent);
      },
      onStream: (stream) => {
        this.remoteStreams.set(peerId, stream);
        this.config.onRemoteStream?.(peerId, stream);

        const participant = this.upsertRemoteParticipant(peerId, name);
        participant.isMicrophoneEnabled = stream.getAudioTracks().length > 0;
        participant.isCameraEnabled = stream.getVideoTracks().length > 0;

        // Remote mute/unmute arrives as track mute events, not renegotiation.
        stream.getTracks().forEach((track) => {
          const sync = () => {
            const current = this.participants.get(peerId);
            if (!current) return;
            if (track.kind === "audio") current.isMicrophoneEnabled = !track.muted;
            if (track.kind === "video") current.isCameraEnabled = !track.muted;
            this.emitTrackChanged(peerId, track.kind === "audio" ? "audio" : "video");
          };
          track.addEventListener("mute", sync);
          track.addEventListener("unmute", sync);
        });

        this.participantJoinedCallbacks.forEach((cb) => cb(participant));
      },
      onStateChange: (state) => {
        const participant = this.participants.get(peerId);
        if (participant) {
          participant.connectionState =
            state === "connected"
              ? "connected"
              : state === "reconnecting"
                ? "reconnecting"
                : state === "failed"
                  ? "failed"
                  : "connecting";
          this.emitTrackChanged(peerId, "video");
        }
        if (state === "disconnected") this.handlePeerLeft(peerId);
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

    return peer;
  }

  private upsertRemoteParticipant(peerId: string, name?: string): CallParticipant {
    const existing = this.participants.get(peerId);
    if (existing) {
      if (name) existing.name = name;
      return existing;
    }

    const participant: CallParticipant = {
      id: peerId,
      name: name || "Guest",
      isLocal: false,
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
      isScreenSharing: false,
      connectionState: "connecting",
    };
    this.participants.set(peerId, participant);
    this.participantJoinedCallbacks.forEach((cb) => cb(participant));
    return participant;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleOffer(from: string, payload: any): void {
    if (from === this.config.localParticipantId) return;

    // The offer may be the first thing we hear from this peer (our ack and
    // their offer race). Create the receiving side on demand instead of
    // dropping the offer, which used to deadlock the handshake.
    const peer = this.peerConnections.get(from) ?? this.ensurePeer(from);
    peer?.handleSignal(payload);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleAnswer(from: string, payload: any): void {
    if (from === this.config.localParticipantId) return;
    this.peerConnections.get(from)?.handleSignal(payload);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleIceCandidate(from: string, payload: any): void {
    if (from === this.config.localParticipantId) return;

    // Candidates trickle in ahead of the offer; ensurePeer queues them.
    const peer = this.peerConnections.get(from) ?? this.ensurePeer(from);
    peer?.handleSignal(payload);
  }

  private handlePeerState(
    from: string,
    state: {
      isMicrophoneEnabled: boolean;
      isCameraEnabled: boolean;
      isScreenSharing: boolean;
    },
  ): void {
    if (from === this.config.localParticipantId) return;

    const participant = this.participants.get(from);
    if (!participant) return;

    participant.isMicrophoneEnabled = state.isMicrophoneEnabled;
    participant.isCameraEnabled = state.isCameraEnabled;
    participant.isScreenSharing = state.isScreenSharing;
    this.emitTrackChanged(from, "audio");
  }

  private emitTrackChanged(
    participantId: string,
    track: "audio" | "video" | "screen",
  ): void {
    this.trackChangedCallbacks.forEach((cb) =>
      cb({ participantId, track, change: "enabled" }),
    );
  }

  private broadcastLocalState(): void {
    this.config.onSignalEvent({
      type: "peer-state",
      from: this.config.localParticipantId,
      isMicrophoneEnabled: this.localMicEnabled,
      isCameraEnabled: this.localCameraEnabled,
      isScreenSharing: this.localScreenSharing,
    });
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
