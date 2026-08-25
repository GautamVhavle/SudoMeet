"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";

interface Participant {
  id: string;
  name: string;
  avatarUrl?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isLocal?: boolean;
  srcObject?: MediaStream | null;
}

interface VideoGridProps {
  participants: Participant[];
  className?: string;
}

export const VideoGrid = React.forwardRef<HTMLDivElement, VideoGridProps>(
  ({ participants, className }, ref) => {
    const gridCols = React.useMemo(() => {
      const count = participants.length;
      if (count === 1) return "grid-cols-1";
      if (count === 2) return "grid-cols-2";
      if (count <= 4) return "grid-cols-2";
      if (count <= 6) return "grid-cols-3";
      return "grid-cols-4";
    }, [participants.length]);

    return (
      <div
        ref={ref}
        className={cn(
          "grid gap-3 w-full h-full p-4",
          gridCols,
          className
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
            srcObject={participant.srcObject}
          />
        ))}
      </div>
    );
  }
);
VideoGrid.displayName = "VideoGrid";
