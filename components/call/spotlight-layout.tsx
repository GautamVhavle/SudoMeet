"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";
import { Filmstrip } from "./filmstrip";
import type { GridParticipant } from "./video-grid";

interface SpotlightLayoutProps {
  activeParticipant: GridParticipant;
  otherParticipants: GridParticipant[];
  audioOutputDeviceId?: string | null;
  pinnedId?: string | null;
  onPin?: (participantId: string) => void;
  className?: string;
}

export const SpotlightLayout = React.forwardRef<HTMLDivElement, SpotlightLayoutProps>(
  (
    {
      activeParticipant,
      otherParticipants,
      audioOutputDeviceId,
      pinnedId,
      onPin,
      className,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full min-h-0 w-full flex-col gap-2 p-2 sm:gap-3 sm:p-4",
          className,
        )}
      >
        <div className="min-h-0 flex-1">
          <VideoTile
            participantId={activeParticipant.id}
            name={activeParticipant.name}
            avatarUrl={activeParticipant.avatarUrl}
            isSpeaking={activeParticipant.isSpeaking}
            isMuted={activeParticipant.isMuted}
            isVideoOff={activeParticipant.isVideoOff}
            isLocal={activeParticipant.isLocal}
            isScreenSharing={activeParticipant.isScreenSharing}
            connectionState={activeParticipant.connectionState}
            srcObject={activeParticipant.srcObject}
            audioOutputDeviceId={audioOutputDeviceId}
            isPinned={pinnedId === activeParticipant.id}
            onPin={onPin}
            className="h-full"
          />
        </div>

        {otherParticipants.length > 0 && (
          <Filmstrip
            participants={otherParticipants}
            audioOutputDeviceId={audioOutputDeviceId}
            pinnedId={pinnedId}
            onPin={onPin}
          />
        )}
      </div>
    );
  },
);
SpotlightLayout.displayName = "SpotlightLayout";
