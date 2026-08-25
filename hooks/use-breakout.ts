/**
 * Breakout rooms hook — manages breakout room state and API calls.
 *
 * Features:
 * - Create breakout rooms
 * - Assign participants
 * - Broadcast messages
 * - Return to main room
 * - Countdown timer
 *
 * Phase 12: Recording and breakout rooms.
 */

"use client";

import { useCallback, useEffect } from "react";
import { useBreakoutStore } from "@/stores/breakout";
import type { BreakoutBroadcast } from "@/lib/breakout";

export interface UseBreakoutOptions {
  meetingId: string;
}

export function useBreakout({ meetingId }: UseBreakoutOptions) {
  const {
    rooms,
    assignments,
    activeBreakoutId,
    countdownSeconds,
    lastBroadcast,
    isLoading,
    error,
    setRooms,
    addRoom,
    setAssignments,
    setActiveBreakout,
    setCountdown,
    setBroadcast,
    setLoading,
    setError,
    reset,
  } = useBreakoutStore();

  /**
   * Load breakout rooms from API.
   */
  const loadBreakouts = useCallback(async () => {
    if (!meetingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/breakouts`);
      if (!response.ok) {
        throw new Error(`Failed to load breakouts: ${response.statusText}`);
      }

      const data = await response.json();
      setRooms(data.breakoutRooms ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load breakouts";
      setError(message);
      console.error("[useBreakout] Load breakouts error:", err);
    } finally {
      setLoading(false);
    }
  }, [meetingId, setLoading, setError, setRooms]);

  /**
   * Create a new breakout room.
   */
  const createBreakout = useCallback(
    async (name: string, capacity?: number) => {
      if (!meetingId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/meetings/${meetingId}/breakouts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, capacity }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || "Failed to create breakout");
        }

        const breakout = await response.json();
        addRoom(breakout);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create breakout";
        setError(message);
        console.error("[useBreakout] Create breakout error:", err);
      } finally {
        setLoading(false);
      }
    },
    [meetingId, setLoading, setError, addRoom],
  );

  /**
   * Assign participants to breakout rooms.
   */
  const assignParticipants = useCallback(
    async (assignments: Array<{ participantId: string; breakoutRoomId: string }>) => {
      if (!meetingId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/meetings/${meetingId}/breakouts/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "assign", assignments }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || "Failed to assign participants");
        }

        const data = await response.json();
        setAssignments(data.assignments ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to assign participants";
        setError(message);
        console.error("[useBreakout] Assign participants error:", err);
      } finally {
        setLoading(false);
      }
    },
    [meetingId, setLoading, setError, setAssignments],
  );

  /**
   * Broadcast a message to all breakout rooms.
   */
  const broadcast = useCallback(
    async (broadcastData: BreakoutBroadcast) => {
      if (!meetingId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/meetings/${meetingId}/breakouts/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "broadcast", broadcast: broadcastData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || "Failed to broadcast");
        }

        if (broadcastData.type === "message" && broadcastData.payload.message) {
          setBroadcast(broadcastData.payload.message);
        } else if (broadcastData.type === "countdown" && broadcastData.payload.seconds) {
          setCountdown(broadcastData.payload.seconds);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to broadcast";
        setError(message);
        console.error("[useBreakout] Broadcast error:", err);
      } finally {
        setLoading(false);
      }
    },
    [meetingId, setLoading, setError, setBroadcast, setCountdown],
  );

  /**
   * Return all participants to main room.
   */
  const returnToMain = useCallback(async () => {
    if (!meetingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/breakouts/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "return" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to return to main");
      }

      setActiveBreakout(null);
      setAssignments([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to return to main";
      setError(message);
      console.error("[useBreakout] Return to main error:", err);
    } finally {
      setLoading(false);
    }
  }, [meetingId, setLoading, setError, setActiveBreakout, setAssignments]);

  /**
   * Load breakouts on mount.
   */
  useEffect(() => {
    loadBreakouts();
  }, [loadBreakouts]);

  /**
   * Reset state on unmount.
   */
  useEffect(() => {
    return () => reset();
  }, [reset]);

  return {
    rooms,
    assignments,
    activeBreakoutId,
    countdownSeconds,
    lastBroadcast,
    isLoading,
    error,
    loadBreakouts,
    createBreakout,
    assignParticipants,
    broadcast,
    returnToMain,
    setActiveBreakout,
  };
}
