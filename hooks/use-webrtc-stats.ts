/**
 * Hook for collecting and polling WebRTC statistics (Phase 14).
 *
 * Polls the active MediaProvider for stats at regular intervals
 * and exposes them for the stats overlay component.
 */

"use client";

import { useEffect, useState } from "react";
import type { MediaProvider } from "@/lib/media/types";
import type { WebRTCStats } from "@/lib/media/types";

export interface UseWebRTCStatsOptions {
  /** The active media provider to poll stats from. */
  provider: MediaProvider | null;
  /** Polling interval in milliseconds (default: 1000ms = 1 second). */
  interval?: number;
  /** Whether to actively poll (default: true). */
  enabled?: boolean;
}

/**
 * Poll WebRTC stats from the active media provider.
 */
export function useWebRTCStats({
  provider,
  interval = 1000,
  enabled = true,
}: UseWebRTCStatsOptions): WebRTCStats {
  const [stats, setStats] = useState<WebRTCStats>({});

  useEffect(() => {
    if (!provider || !enabled) {
      setStats({});
      return;
    }

    let mounted = true;

    const pollStats = async () => {
      if (!mounted) return;

      try {
        const newStats = await provider.getStats();
        if (mounted) {
          setStats(newStats);
        }
      } catch (error) {
        console.error("[useWebRTCStats] Failed to get stats:", error);
      }
    };

    // Poll immediately
    pollStats();

    // Then poll at interval
    const intervalId = setInterval(pollStats, interval);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [provider, interval, enabled]);

  return stats;
}
