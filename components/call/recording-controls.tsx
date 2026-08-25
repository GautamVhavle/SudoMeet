/**
 * Recording controls — start/stop recording button.
 *
 * Features:
 * - Start/stop recording
 * - Recording status display
 * - Error handling
 * - Host-only visibility
 *
 * Phase 12: Recording and breakout rooms.
 */

"use client";

import { Button } from "@/components/ui/button";
import { useRecording } from "@/hooks/use-recording";

export interface RecordingControlsProps {
  meetingId: string;
  isHost: boolean;
}

export function RecordingControls({ meetingId, isHost }: RecordingControlsProps) {
  const { status, isLoading, error, startRecording, stopRecording } = useRecording({ meetingId });

  if (!isHost) {
    return null;
  }

  const canStart = !status || status === "FAILED";
  const canStop = status === "RECORDING" || status === "STARTING";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {canStart && (
          <Button
            onClick={startRecording}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {isLoading ? "Starting..." : "Start Recording"}
          </Button>
        )}

        {canStop && (
          <Button
            onClick={stopRecording}
            disabled={isLoading}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-white" />
            {isLoading ? "Stopping..." : "Stop Recording"}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      {status && status !== "RECORDING" && status !== "FAILED" && (
        <p className="text-sm text-zinc-400">
          Status: {status}
        </p>
      )}
    </div>
  );
}
