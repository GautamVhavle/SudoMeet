/**
 * Wrapper around simple-peer for WebRTC peer connections.
 *
 * Handles offer/answer/ICE exchange, reconnection, and media track management
 * for a single P2P connection (local ↔ remote).
 */

import SimplePeer from "simple-peer";
import type { Instance as SimplePeerInstance } from "simple-peer";

export type PeerConnectionState =
  | "new"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "failed";


export interface PeerConnectionCallbacks {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSignal: (signal: any) => void;
  onStream: (stream: MediaStream) => void;
  onStateChange: (state: PeerConnectionState) => void;
  onError: (error: Error) => void;
}

/**
 * ICE servers for the mesh.
 *
 * STUN alone cannot traverse symmetric NAT or strict mobile carrier networks,
 * which is why calls between devices on different networks silently fail to
 * connect. Set NEXT_PUBLIC_TURN_URL / _USERNAME / _CREDENTIAL to add a relay.
 */
function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(",").map((u) => u.trim()).filter(Boolean),
      ...(turnUsername ? { username: turnUsername } : {}),
      ...(turnCredential ? { credential: turnCredential } : {}),
    });
  }

  return servers;
}

/**
 * Manages a single WebRTC peer connection using simple-peer.
 */
export class PeerConnection {
  private peer: SimplePeerInstance | null = null;
  private state: PeerConnectionState = "new";
  private callbacks: PeerConnectionCallbacks;
  private remotePeerId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pendingSignals: any[] = [];
  private destroyed = false;

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
   *
   * Signals routinely arrive before the local peer object exists (the remote
   * side starts trickling ICE the moment it creates its offer), so anything
   * early is queued and flushed once the peer is created.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSignal(signal: any): void {
    if (!this.peer) {
      this.pendingSignals.push(signal);
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
   * Swap the outbound video track (camera ↔ screen share).
   *
   * Uses sender.replaceTrack so the swap happens without renegotiation.
   * The previous removeTrack/addTrack approach dropped the audio sender and
   * triggered a renegotiation storm that frequently killed the connection.
   */
  replaceStream(newStream: MediaStream): void {
    const pc = this.getPeerConnection();
    if (!pc) return;

    try {
      const senders = pc.getSenders();

      for (const kind of ["video", "audio"] as const) {
        const nextTrack =
          kind === "video"
            ? newStream.getVideoTracks()[0]
            : newStream.getAudioTracks()[0];
        if (!nextTrack) continue;

        const sender = senders.find((s) => s.track?.kind === kind);
        if (sender) {
          sender.replaceTrack(nextTrack).catch((error) => {
            console.error(`[PeerConnection] replaceTrack(${kind}) failed:`, error);
          });
        } else {
          this.peer?.addTrack(nextTrack, newStream);
        }
      }
    } catch (error) {
      console.error(`[PeerConnection] Replace stream error:`, error);
    }
  }

  /** Ask ICE to find a new candidate pair after a network change. */
  restartIce(): void {
    const pc = this.getPeerConnection();
    if (!pc) return;
    try {
      pc.restartIce();
    } catch (error) {
      console.error(`[PeerConnection] restartIce failed:`, error);
    }
  }

  /** True once the peer has been created (offer/answer can be processed). */
  isReady(): boolean {
    return this.peer !== null;
  }

  /**
   * Close the peer connection and clean up resources.
   */
  close(): void {
    this.destroyed = true;
    this.pendingSignals = [];
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // simple-peer throws if already destroyed.
      }
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
    const pc = this.getPeerConnection();
    if (!pc) return null;

    try {
      return await pc.getStats();
    } catch (error) {
      console.error(`[PeerConnection] getStats error:`, error);
      return null;
    }
  }

  private createPeer(initiator: boolean, stream: MediaStream): void {
    if (this.peer || this.destroyed) return;

    this.peer = new SimplePeer({
      initiator,
      stream,
      trickle: true, // Send ICE candidates incrementally
      config: { iceServers: getIceServers() },
      // Chrome defaults to VP8-only for some setups; keep both directions open.
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      },
    });

    this.attachEventHandlers();
    this.setState("connecting");

    // Flush signals that arrived before the peer existed.
    const queued = this.pendingSignals;
    this.pendingSignals = [];
    for (const signal of queued) this.handleSignal(signal);
  }

  private getPeerConnection(): RTCPeerConnection | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = (this.peer as any)?._pc as RTCPeerConnection | undefined;
    if (!pc || pc.connectionState === "closed") return null;
    return pc;
  }

  private attachEventHandlers(): void {
    if (!this.peer) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.peer.on("signal", (data: any) => {
      this.callbacks.onSignal(data);
    });

    this.peer.on("stream", (stream: MediaStream) => {
      this.callbacks.onStream(stream);
    });

    this.peer.on("connect", () => {
      this.setState("connected");
    });

    this.peer.on("close", () => {
      this.setState("disconnected");
    });

    this.peer.on("error", (error: Error) => {
      console.error(`[PeerConnection] Error with ${this.remotePeerId}:`, error);
      this.setState("failed");
      this.callbacks.onError(error);
    });

    // simple-peer only reports "connect" once; track ICE directly so the UI
    // reflects drops and so we can attempt recovery on a transient failure.
    const pc = this.getPeerConnection();
    if (pc) {
      pc.addEventListener("iceconnectionstatechange", () => {
        switch (pc.iceConnectionState) {
          case "connected":
          case "completed":
            this.setState("connected");
            break;
          case "disconnected":
            this.setState("reconnecting");
            break;
          case "failed":
            this.setState("failed");
            this.restartIce();
            break;
        }
      });
    }
  }

  private setState(newState: PeerConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange(newState);
    }
  }
}
