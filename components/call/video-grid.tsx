"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";

export interface GridParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isLocal?: boolean;
  isScreenSharing?: boolean;
  connectionState?: "connecting" | "connected" | "reconnecting" | "failed";
  srcObject?: MediaStream | null;
}

interface VideoGridProps {
  participants: GridParticipant[];
  pinnedId?: string | null;
  audioOutputDeviceId?: string | null;
  onPin?: (participantId: string) => void;
  className?: string;
}

/**
 * Tile layout that always fits the available box.
 *
 * Columns are chosen per breakpoint and rows are sized with `grid-rows-*` so
 * tiles shrink to fit instead of overflowing and forcing the page to scroll.
 */
function getGridClasses(count: number): string {
  if (count <= 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1";
  if (count <= 4) return "grid-cols-1 grid-rows-3 sm:grid-cols-2 sm:grid-rows-2";
  if (count <= 6) return "grid-cols-2 grid-rows-3 lg:grid-cols-3 lg:grid-rows-2";
  if (count <= 9) return "grid-cols-2 grid-rows-4 lg:grid-cols-3 lg:grid-rows-3";
  return "grid-cols-2 grid-rows-5 lg:grid-cols-4 lg:grid-rows-3";
}

export const VideoGrid = React.forwardRef<HTMLDivElement, VideoGridProps>(
  ({ participants, pinnedId, audioOutputDeviceId, onPin, className }, ref) => {
    const gridClasses = React.useMemo(
      () => getGridClasses(participants.length),
      [participants.length],
    );

    if (participants.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex h-full w-full items-center justify-center p-4 text-sm text-muted-foreground",
            className,
          )}
        >
          Waiting for participants…
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid h-full w-full min-h-0 gap-2 p-2 sm:gap-3 sm:p-4",
          gridClasses,
          className,
        )}
      >
        {participants.map((participant) => (
          <VideoTile
            key={participant.id}
            participantId={participant.id}
            name={participant.name}
            avatarUrl={participant.avatarUrl}
            isSpeaking={participant.isSpeaking}
            isMuted={participant.isMuted}
            isVideoOff={participant.isVideoOff}
            isLocal={participant.isLocal}
            isScreenSharing={participant.isScreenSharing}
            connectionState={participant.connectionState}
            srcObject={participant.srcObject}
            audioOutputDeviceId={audioOutputDeviceId}
            isPinned={pinnedId === participant.id}
            onPin={onPin}
          />
        ))}
      </div>
    );
  },
);
VideoGrid.displayName = "VideoGrid";
