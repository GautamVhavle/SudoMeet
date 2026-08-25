"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";
import type { GridParticipant } from "./video-grid";

interface FilmstripProps {
  participants: GridParticipant[];
  audioOutputDeviceId?: string | null;
  pinnedId?: string | null;
  onPin?: (participantId: string) => void;
  className?: string;
}

export const Filmstrip = React.forwardRef<HTMLDivElement, FilmstripProps>(
  ({ participants, audioOutputDeviceId, pinnedId, onPin, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex shrink-0 gap-2 overflow-x-auto pb-1", className)}
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
            className="aspect-video w-28 shrink-0 sm:w-40"
          />
        ))}
      </div>
    );
  },
);
Filmstrip.displayName = "Filmstrip";
