/**
 * Client hook for subscribing to and publishing signaling events.
 *
 * GET /api/signal/[meetingId] — SSE subscription
 * POST /api/signal/[meetingId] — Publish event
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SignalEvent } from "@/lib/media/types";

export interface UseSignalingOptions {
  meetingId: string;
  enabled: boolean;
  onEvent: (event: SignalEvent) => void;
}

export function useSignaling({ meetingId, enabled, onEvent }: UseSignalingOptions) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Held in a ref so a changing handler never tears down the SSE stream.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Subscribe to SSE stream
  useEffect(() => {
    if (!enabled || !meetingId) {
      return;
    }

    let disposed = false;
    let attempt = 0;

    function connect() {
      if (disposed) return;

      const eventSource = new EventSource(`/api/signal/${meetingId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        attempt = 0;
        setConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          onEventRef.current(JSON.parse(e.data) as SignalEvent);
        } catch (error) {
          console.error("[useSignaling] Failed to parse event:", error);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource.close();
        if (disposed) return;

        // Back off so a server restart doesn't become a reconnect storm.
        attempt += 1;
        const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
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
  }, [meetingId, enabled]);

  const publishEvent = useCallback(
    async (event: SignalEvent) => {
      try {
        const response = await fetch(`/api/signal/${meetingId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          console.error(
            "[useSignaling] Failed to publish event:",
            await response.text(),
          );
        }
      } catch (error) {
        console.error("[useSignaling] Publish error:", error);
      }
    },
    [meetingId],
  );

  return {
    connected,
    publishEvent,
  };
}
