/**
 * P2P mesh orchestration hook — combines signaling and P2PMediaProvider.
 *
 * Manages:
 *   - Local media acquisition
 *   - Signaling subscription (SSE)
 *   - P2P provider initialization
 *   - Signal event routing
 *   - Participant state
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import type { CallParticipant, SignalEvent } from "@/lib/media/types";
import { P2PMediaProvider } from "@/lib/media/p2p/p2p-provider";
import { useSignaling } from "./use-signaling";

export interface UseP2PMeshOptions {
  meetingId: string;
  localParticipantId: string;
  localParticipantName: string;
  autoConnect?: boolean;
}

export interface UseP2PMeshReturn {
  participants: CallParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
  setCameraEnabled: (enabled: boolean) => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
}

export function useP2PMesh({
  meetingId,
  localParticipantId,
  localParticipantName,
  autoConnect = false,
}: UseP2PMeshOptions): UseP2PMeshReturn {
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  const providerRef = useRef<P2PMediaProvider | null>(null);

  // Initialize provider on mount
  useEffect(() => {
    const provider = new P2PMediaProvider({
      meetingId,
      localParticipantId,
      localParticipantName,
      onSignalEvent: (event) => {
        signaling.publishEvent(event);
      },
    });

    providerRef.current = provider;

    // Subscribe to participant events
    const unsubJoined = provider.onParticipantJoined((participant) => {
      setParticipants(provider.getParticipants());
      // Update remote streams
      if (!participant.isLocal) {
        const stream = provider.getRemoteStream(participant.id);
        if (stream) {
          setRemoteStreams((prev) => new Map(prev).set(participant.id, stream));
        }
      }
    });

    const unsubLeft = provider.onParticipantLeft((participant) => {
      setParticipants(provider.getParticipants());
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(participant.id);
        return next;
      });
    });

    const unsubTrackChanged = provider.onTrackChanged(() => {
      setParticipants(provider.getParticipants());
    });

    return () => {
      unsubJoined();
      unsubLeft();
      unsubTrackChanged();
      provider.disconnect();
    };
  }, [meetingId, localParticipantId, localParticipantName]);

  // Handle incoming signal events
  const handleSignalEvent = useCallback(
    (event: SignalEvent) => {
      if (providerRef.current) {
        providerRef.current.handleSignalEvent(event);
      }
    },
    [],
  );

  // Signaling subscription
  const signaling = useSignaling({
    meetingId,
    enabled: isConnected,
    onEvent: handleSignalEvent,
  });

  // Connect to the mesh
  const connect = useCallback(async () => {
    if (!providerRef.current) return;

    try {
      await providerRef.current.connect();
      setIsConnected(true);
      setLocalStream(providerRef.current.getLocalStream());
      setParticipants(providerRef.current.getParticipants());
    } catch (error) {
      console.error("[useP2PMesh] Connect failed:", error);
      throw error;
    }
  }, []);

  // Disconnect from the mesh
  const disconnect = useCallback(async () => {
    if (!providerRef.current) return;

    await providerRef.current.disconnect();
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
  }, []);

  // Media controls
  const setMicrophoneEnabled = useCallback(async (enabled: boolean) => {
    await providerRef.current?.setMicrophoneEnabled(enabled);
    setParticipants(providerRef.current?.getParticipants() || []);
  }, []);

  const setCameraEnabled = useCallback(async (enabled: boolean) => {
    await providerRef.current?.setCameraEnabled(enabled);
    setParticipants(providerRef.current?.getParticipants() || []);
  }, []);

  const startScreenShare = useCallback(async () => {
    await providerRef.current?.startScreenShare();
    setParticipants(providerRef.current?.getParticipants() || []);
  }, []);

  const stopScreenShare = useCallback(async () => {
    await providerRef.current?.stopScreenShare();
    setParticipants(providerRef.current?.getParticipants() || []);
  }, []);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && !isConnected) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, isConnected]);

  return {
    participants,
    localStream,
    remoteStreams,
    isConnected,
    connect,
    disconnect,
    setMicrophoneEnabled,
    setCameraEnabled,
    startScreenShare,
    stopScreenShare,
  };
}
