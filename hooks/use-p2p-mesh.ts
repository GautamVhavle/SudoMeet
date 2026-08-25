/**
 * P2P mesh orchestration hook — combines signaling and P2PMediaProvider.
 *
 * Ordering matters: the SSE stream must be live *before* we announce ourselves,
 * otherwise acks from peers already in the room arrive before we're listening
 * and the mesh never forms.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CallParticipant, SignalEvent, WebRTCStats } from "@/lib/media/types";
import { P2PMediaProvider } from "@/lib/media/p2p/p2p-provider";
import { useSignaling } from "./use-signaling";

export interface UseP2PMeshOptions {
  meetingId: string;
  localParticipantId: string;
  localParticipantName: string;
  audioDeviceId?: string | null;
  videoDeviceId?: string | null;
  startMuted?: boolean;
  startCameraOff?: boolean;
  autoConnect?: boolean;
}

export interface UseP2PMeshReturn {
  participants: CallParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isConnected: boolean;
  isConnecting: boolean;
  signalConnected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
  setCameraEnabled: (enabled: boolean) => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  switchDevices: (options: {
    audioDeviceId?: string | null;
    videoDeviceId?: string | null;
  }) => Promise<void>;
  getStats: () => Promise<WebRTCStats>;
}

function describeMediaError(error: unknown): string {
  const name = (error as { name?: string })?.name;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera and microphone access was blocked. Allow permissions in your browser, then rejoin.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera or microphone was found. Connect a device and try again.";
    case "NotReadableError":
      return "Your camera or microphone is already in use by another app.";
    default:
      return error instanceof Error ? error.message : "Could not start your devices.";
  }
}

export function useP2PMesh({
  meetingId,
  localParticipantId,
  localParticipantName,
  audioDeviceId,
  videoDeviceId,
  startMuted = false,
  startCameraOff = false,
  autoConnect = false,
}: UseP2PMeshOptions): UseP2PMeshReturn {
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerRef = useRef<P2PMediaProvider | null>(null);
  // Outbound signals go through a ref: the provider is built once, while the
  // signaling helper is recreated on every render.
  const publishRef = useRef<(event: SignalEvent) => void>(() => {});
  const connectingRef = useRef(false);

  const syncParticipants = useCallback(() => {
    const provider = providerRef.current;
    if (!provider) return;
    // Fresh array identity so React re-renders after in-place mutations.
    setParticipants([...provider.getParticipants()]);
  }, []);

  // Build the provider once per room/identity.
  useEffect(() => {
    const provider = new P2PMediaProvider({
      meetingId,
      localParticipantId,
      localParticipantName,
      audioDeviceId,
      videoDeviceId,
      startMuted,
      startCameraOff,
      onSignalEvent: (event) => publishRef.current(event),
      onRemoteStream: (peerId, stream) => {
        setRemoteStreams((prev) => new Map(prev).set(peerId, stream));
      },
    });

    providerRef.current = provider;

    const unsubJoined = provider.onParticipantJoined(() => syncParticipants());
    const unsubLeft = provider.onParticipantLeft((participant) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(participant.id);
        return next;
      });
      syncParticipants();
    });
    const unsubTrackChanged = provider.onTrackChanged(() => syncParticipants());

    return () => {
      unsubJoined();
      unsubLeft();
      unsubTrackChanged();
      provider.disconnect();
      providerRef.current = null;
    };
    // Device and mute options are read at construction, then applied live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, localParticipantId, localParticipantName, syncParticipants]);

  const handleSignalEvent = useCallback(
    (event: SignalEvent) => {
      providerRef.current?.handleSignalEvent(event);
      syncParticipants();
    },
    [syncParticipants],
  );

  // Subscribe as soon as the room is known — not after connect() — so no
  // handshake events are missed.
  const signaling = useSignaling({
    meetingId,
    enabled: Boolean(meetingId),
    onEvent: handleSignalEvent,
  });

  const { publishEvent, connected: signalConnected } = signaling;

  useEffect(() => {
    publishRef.current = publishEvent;
  }, [publishEvent]);

  const connect = useCallback(async () => {
    const provider = providerRef.current;
    if (!provider || connectingRef.current) return;

    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      // Show the local preview immediately, before signalling starts.
      const stream = await provider.acquireMedia();
      setLocalStream(stream);
      syncParticipants();

      await provider.connect();
      setIsConnected(true);
      syncParticipants();
    } catch (err) {
      console.error("[useP2PMesh] Connect failed:", err);
      setError(describeMediaError(err));
    } finally {
      connectingRef.current = false;
      setIsConnecting(false);
    }
  }, [syncParticipants]);

  const disconnect = useCallback(async () => {
    await providerRef.current?.disconnect();
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
  }, []);

  // Re-announce after the SSE stream drops and recovers, so peers that missed
  // the original announcement can still find us.
  const wasSignalConnected = useRef(false);
  useEffect(() => {
    if (signalConnected && !wasSignalConnected.current && isConnected) {
      providerRef.current?.announce();
    }
    wasSignalConnected.current = signalConnected;
  }, [signalConnected, isConnected]);

  const setMicrophoneEnabled = useCallback(
    async (enabled: boolean) => {
      await providerRef.current?.setMicrophoneEnabled(enabled);
      syncParticipants();
    },
    [syncParticipants],
  );

  const setCameraEnabled = useCallback(
    async (enabled: boolean) => {
      await providerRef.current?.setCameraEnabled(enabled);
      syncParticipants();
    },
    [syncParticipants],
  );

  const startScreenShare = useCallback(async () => {
    await providerRef.current?.startScreenShare();
    syncParticipants();
  }, [syncParticipants]);

  const stopScreenShare = useCallback(async () => {
    await providerRef.current?.stopScreenShare();
    syncParticipants();
  }, [syncParticipants]);

  const switchDevices = useCallback(
    async (options: {
      audioDeviceId?: string | null;
      videoDeviceId?: string | null;
    }) => {
      const next = await providerRef.current?.switchDevices(options);
      if (next) setLocalStream(next);
      syncParticipants();
    },
    [syncParticipants],
  );

  const getStats = useCallback(async () => {
    return (await providerRef.current?.getStats()) ?? {};
  }, []);

  // Leave cleanly when the tab closes so peers don't stare at a frozen tile.
  useEffect(() => {
    const handleUnload = () => {
      if (!providerRef.current) return;
      navigator.sendBeacon?.(
        `/api/signal/${meetingId}`,
        new Blob(
          [JSON.stringify({ type: "peer-left", peerId: localParticipantId })],
          { type: "application/json" },
        ),
      );
    };

    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, [meetingId, localParticipantId]);

  useEffect(() => {
    if (autoConnect && !isConnected && !connectingRef.current) {
      void connect();
    }
  }, [autoConnect, isConnected, connect]);

  return {
    participants,
    localStream,
    remoteStreams,
    isConnected,
    isConnecting,
    signalConnected,
    error,
    connect,
    disconnect,
    setMicrophoneEnabled,
    setCameraEnabled,
    startScreenShare,
    stopScreenShare,
    switchDevices,
    getStats,
  };
}
