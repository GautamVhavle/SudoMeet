/**
 * Screen share hook — wraps MediaProvider screen share lifecycle.
 *
 * Handles:
 *   - getDisplayMedia() acquisition
 *   - Track replacement in peer connections
 *   - Screen share state
 *   - Stop sharing (user or system initiated)
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { P2PMediaProvider } from "@/lib/media/p2p/p2p-provider";

export interface UseScreenShareOptions {
  provider: P2PMediaProvider | null;
}

export interface UseScreenShareReturn {
  isScreenSharing: boolean;
  isSupported: boolean;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  error: Error | null;
}

export function useScreenShare({ provider }: UseScreenShareOptions): UseScreenShareReturn {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check if getDisplayMedia is supported
  const isSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  // Listen to track changes from provider
  useEffect(() => {
    if (!provider) return;

    const unsubscribe = provider.onTrackChanged((event) => {
      if (event.track === "screen") {
        setIsScreenSharing(event.change === "started");
      }
    });

    return unsubscribe;
  }, [provider]);

  const startScreenShare = useCallback(async () => {
    if (!provider) {
      setError(new Error("Media provider not initialized"));
      return;
    }

    if (!isSupported) {
      setError(new Error("Screen sharing is not supported in this browser"));
      return;
    }

    try {
      setError(null);
      await provider.startScreenShare();
      setIsScreenSharing(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to start screen share");
      setError(error);
      setIsScreenSharing(false);
      throw error;
    }
  }, [provider, isSupported]);

  const stopScreenShare = useCallback(async () => {
    if (!provider) return;

    try {
      setError(null);
      await provider.stopScreenShare();
      setIsScreenSharing(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to stop screen share");
      setError(error);
      throw error;
    }
  }, [provider]);

  return {
    isScreenSharing,
    isSupported,
    startScreenShare,
    stopScreenShare,
    error,
  };
}
