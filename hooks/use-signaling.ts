/**
 * Client hook for subscribing to and publishing signaling events.
 *
 * GET /api/signal/[meetingId] — SSE subscription
 * POST /api/signal/[meetingId] — Publish event
 */

"use client";

import { useEffect, useRef, useState } from "react";

import type { SignalEvent } from "@/lib/media/types";

export interface UseSignalingOptions {
  meetingId: string;
  enabled: boolean;
  onEvent: (event: SignalEvent) => void;
}

export function useSignaling({ meetingId, enabled, onEvent }: UseSignalingOptions) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to SSE stream
  useEffect(() => {
    if (!enabled || !meetingId) {
      return;
    }

    function connect() {
      const eventSource = new EventSource(`/api/signal/${meetingId}`);

      eventSource.onopen = () => {
        console.log("[useSignaling] Connected to signal stream");
        setConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as SignalEvent;
          onEvent(event);
        } catch (error) {
          console.error("[useSignaling] Failed to parse event:", error);
        }
      };

      eventSource.onerror = () => {
        console.error("[useSignaling] SSE error - reconnecting in 2s");
        setConnected(false);
        eventSource.close();

        // Reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      eventSourceRef.current = eventSource;
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setConnected(false);
    };
  }, [meetingId, enabled, onEvent]);

  // Publish signal event
  const publishEvent = async (event: SignalEvent) => {
    try {
      const response = await fetch(`/api/signal/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        console.error("[useSignaling] Failed to publish event:", await response.text());
      }
    } catch (error) {
      console.error("[useSignaling] Publish error:", error);
    }
  };

  return {
    connected,
    publishEvent,
  };
}
