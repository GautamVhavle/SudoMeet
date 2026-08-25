/**
 * Wrapper around simple-peer for WebRTC peer connections.
 *
 * Handles offer/answer/ICE exchange, reconnection, and media track management
 * for a single P2P connection (local ↔ remote).
 */

import SimplePeer from "simple-peer";
import type { Instance as SimplePeerInstance } from "simple-peer";

export type PeerConnectionState = "new" | "connecting" | "connected" | "disconnected" | "failed";

export interface PeerConnectionCallbacks {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSignal: (signal: any) => void;
  onStream: (stream: MediaStream) => void;
  onStateChange: (state: PeerConnectionState) => void;
  onError: (error: Error) => void;
}

/**
 * Manages a single WebRTC peer connection using simple-peer.
 */
export class PeerConnection {
  private peer: SimplePeerInstance | null = null;
  private state: PeerConnectionState = "new";
  private callbacks: PeerConnectionCallbacks;
  private remotePeerId: string;

  constructor(remotePeerId: string, callbacks: PeerConnectionCallbacks) {
    this.remotePeerId = remotePeerId;
    this.callbacks = callbacks;
  }

  /**
   * Initialize the peer connection as the initiator (sends offer).
   */
  initiate(localStream: MediaStream): void {
    this.createPeer(true, localStream);
  }

  /**
   * Initialize the peer connection as the receiver (waits for offer).
   */
  receive(localStream: MediaStream): void {
    this.createPeer(false, localStream);
  }

  /**
   * Process incoming signal from the remote peer.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSignal(signal: any): void {
    if (!this.peer) {
      console.warn(`[PeerConnection] No peer instance for ${this.remotePeerId}`);
      return;
    }

    try {
      this.peer.signal(signal);
    } catch (error) {
      console.error(`[PeerConnection] Signal error for ${this.remotePeerId}:`, error);
      this.setState("failed");
      this.callbacks.onError(error as Error);
    }
  }

  /**
   * Replace the local media stream (e.g., when muting/unmuting).
   */
  replaceStream(newStream: MediaStream): void {
    if (!this.peer) return;

    try {
      // Remove old tracks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const senders = (this.peer as any)._pc?.getSenders?.() || [];
      senders.forEach((sender: RTCRtpSender) => {
        if (sender.track) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.peer as any)._pc?.removeTrack(sender);
        }
      });

      // Add new tracks
      newStream.getTracks().forEach((track) => {
        this.peer?.addTrack(track, newStream);
      });
    } catch (error) {
      console.error(`[PeerConnection] Replace stream error:`, error);
    }
  }

  /**
   * Close the peer connection and clean up resources.
   */
  close(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.setState("disconnected");
  }

  /**
   * Get the current connection state.
   */
  getState(): PeerConnectionState {
    return this.state;
  }

  /**
   * Get WebRTC statistics from the underlying peer connection (Phase 14).
   */
  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.peer) return null;

    try {
      // Access the underlying RTCPeerConnection via simple-peer internal API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pc = (this.peer as any)._pc as RTCPeerConnection | undefined;
      if (!pc || pc.connectionState === "closed") return null;

      return await pc.getStats();
    } catch (error) {
      console.error(`[PeerConnection] getStats error:`, error);
      return null;
    }
  }

  private createPeer(initiator: boolean, stream: MediaStream): void {
    if (this.peer) {
      console.warn(`[PeerConnection] Peer already exists for ${this.remotePeerId}`);
      return;
    }

    this.peer = new SimplePeer({
      initiator,
      stream,
      trickle: true, // Send ICE candidates incrementally
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    });

    this.attachEventHandlers();
    this.setState("connecting");
  }

  private attachEventHandlers(): void {
    if (!this.peer) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.peer.on("signal", (data: any) => {
      this.callbacks.onSignal(data);
    });

    this.peer.on("stream", (stream: MediaStream) => {
      this.setState("connected");
      this.callbacks.onStream(stream);
    });

    this.peer.on("connect", () => {
      console.log(`[PeerConnection] Connected to ${this.remotePeerId}`);
      this.setState("connected");
    });

    this.peer.on("close", () => {
      console.log(`[PeerConnection] Closed connection to ${this.remotePeerId}`);
      this.setState("disconnected");
    });

    this.peer.on("error", (error: Error) => {
      console.error(`[PeerConnection] Error with ${this.remotePeerId}:`, error);
      this.setState("failed");
      this.callbacks.onError(error);
    });
  }

  private setState(newState: PeerConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange(newState);
    }
  }
}
