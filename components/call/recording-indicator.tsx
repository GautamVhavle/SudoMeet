/**
 * Recording indicator — shows recording status in the call UI.
 *
 * Features:
 * - Pulsing red dot when recording
 * - Recording duration timer
 * - Compact display
 *
 * Phase 12: Recording and breakout rooms.
 */

"use client";

import { useEffect, useState } from "react";
import type { RecordingStatus } from "@/lib/recording";

export interface RecordingIndicatorProps {
  status: RecordingStatus | null;
  startedAt?: Date;
}

export function RecordingIndicator({ status, startedAt }: RecordingIndicatorProps) {
  const [duration, setDuration] = useState<string>("0:00");

  // Update duration timer
  useEffect(() => {
    if (status !== "RECORDING" || !startedAt) {
      setDuration("0:00");
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setDuration(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startedAt]);

  if (!status || status === "REQUESTED" || status === "FAILED") {
    return null;
  }

  const isRecording = status === "RECORDING";

  return (
    <div className="flex items-center gap-2 rounded-md bg-zinc-900/90 px-3 py-1.5 text-sm backdrop-blur-sm">
      {/* Pulsing dot */}
      <div className="relative flex h-3 w-3 items-center justify-center">
        {isRecording && (
          <span className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        )}
        <span
          className={`relative h-2 w-2 rounded-full ${
            isRecording ? "bg-red-500" : "bg-zinc-500"
          }`}
        />
      </div>

      {/* Status text */}
      <span className="font-medium text-zinc-100">
        {status === "RECORDING" ? "REC" : status}
      </span>

      {/* Duration (only when recording) */}
      {isRecording && <span className="text-zinc-400">{duration}</span>}
    </div>
  );
}
