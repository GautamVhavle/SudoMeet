"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";
import { Filmstrip } from "./filmstrip";

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

interface SpotlightLayoutProps {
  activeParticipant: Participant;
  otherParticipants: Participant[];
  className?: string;
}

export const SpotlightLayout = React.forwardRef<
  HTMLDivElement,
  SpotlightLayoutProps
>(({ activeParticipant, otherParticipants, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col h-full w-full gap-3 p-4", className)}
    >
      {/* Main spotlight video */}
      <div className="flex-1 min-h-0">
        <VideoTile
          participantId={activeParticipant.id}
          name={activeParticipant.name}
          avatarUrl={activeParticipant.avatarUrl}
          isSpeaking={activeParticipant.isSpeaking}
          isMuted={activeParticipant.isMuted}
          isVideoOff={activeParticipant.isVideoOff}
          isLocal={activeParticipant.isLocal}
          srcObject={activeParticipant.srcObject}
          className="h-full"
        />
      </div>

      {/* Filmstrip of other participants */}
      {otherParticipants.length > 0 && (
        <Filmstrip participants={otherParticipants} />
      )}
    </div>
  );
});
SpotlightLayout.displayName = "SpotlightLayout";
