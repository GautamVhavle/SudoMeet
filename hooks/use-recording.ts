/**
 * Recording hook — manages recording state and API calls.
 *
 * Features:
 * - Start/stop recording
 * - Recording status updates
 * - Recording history
 *
 * Phase 12: Recording and breakout rooms.
 */

"use client";

import { useCallback, useEffect } from "react";
import { useRecordingStore } from "@/stores/recording";

export interface UseRecordingOptions {
  meetingId: string;
}

export function useRecording({ meetingId }: UseRecordingOptions) {
  const {
    status,
    egressId,
    metadata,
    history,
    isLoading,
    error,
    setStatus,
    setEgressId,
    setMetadata,
    setHistory,
    setLoading,
    setError,
    reset,
  } = useRecordingStore();

  /**
   * Load recording history from API.
   */
  const loadHistory = useCallback(async () => {
    if (!meetingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/recording`);
      if (!response.ok) {
        throw new Error(`Failed to load recordings: ${response.statusText}`);
      }

      const data = await response.json();
      setHistory(data.recordings ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load recordings";
      setError(message);
      console.error("[useRecording] Load history error:", err);
    } finally {
      setLoading(false);
    }
  }, [meetingId, setLoading, setError, setHistory]);

  /**
   * Start recording the meeting.
   */
  const startRecording = useCallback(async () => {
    if (!meetingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/recording`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to start recording");
      }

      const data = await response.json();
      setStatus(data.status ?? "STARTING");
      setEgressId(data.egressId ?? null);
      setMetadata({
        id: data.id,
        meetingId,
        storageKey: data.storageKey,
        sizeBytes: null,
        durationSec: null,
        startedAt: new Date(data.startedAt),
        endedAt: null,
        createdAt: new Date(data.startedAt),
      });

      // Reload history
      await loadHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      console.error("[useRecording] Start recording error:", err);
    } finally {
      setLoading(false);
    }
  }, [meetingId, setLoading, setError, setStatus, setEgressId, setMetadata, loadHistory]);

  /**
   * Stop recording the meeting.
   */
  const stopRecording = useCallback(async () => {
    if (!meetingId || !egressId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/meetings/${meetingId}/recording?egressId=${encodeURIComponent(egressId)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to stop recording");
      }

      const data = await response.json();
      setStatus(data.status ?? "STOPPING");

      // Reload history
      await loadHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop recording";
      setError(message);
      console.error("[useRecording] Stop recording error:", err);
    } finally {
      setLoading(false);
    }
  }, [meetingId, egressId, setLoading, setError, setStatus, loadHistory]);

  /**
   * Load recording history on mount.
   */
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /**
   * Reset state on unmount.
   */
  useEffect(() => {
    return () => reset();
  }, [reset]);

  return {
    status,
    egressId,
    metadata,
    history,
    isLoading,
    error,
    startRecording,
    stopRecording,
    loadHistory,
  };
}
