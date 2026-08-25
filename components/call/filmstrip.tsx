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

interface FilmstripProps {
  participants: Participant[];
  className?: string;
}

export const Filmstrip = React.forwardRef<HTMLDivElement, FilmstripProps>(
  ({ participants, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-background-subtle",
          className
        )}
      >
        {participants.map((participant) => (
          <div key={participant.id} className="flex-shrink-0 w-40">
            <VideoTile
              participantId={participant.id}
              name={participant.name}
              avatarUrl={participant.avatarUrl}
              isSpeaking={participant.isSpeaking}
              isMuted={participant.isMuted}
              isVideoOff={participant.isVideoOff}
              isLocal={participant.isLocal}
              srcObject={participant.srcObject}
            />
          </div>
        ))}
      </div>
    );
  }
);
Filmstrip.displayName = "Filmstrip";
