"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";
import { Filmstrip } from "./filmstrip";
import type { GridParticipant } from "./video-grid";

interface SidebarLayoutProps {
  primaryParticipant: GridParticipant;
  sidebarParticipants: GridParticipant[];
  audioOutputDeviceId?: string | null;
  pinnedId?: string | null;
  onPin?: (participantId: string) => void;
  className?: string;
}

/**
 * Large primary stage plus a strip of everyone else.
 *
 * The strip is horizontal on phones and a vertical sidebar from `sm` up — a
 * fixed 12rem sidebar on a narrow screen left almost nothing for the speaker.
 */
export const SidebarLayout = React.forwardRef<HTMLDivElement, SidebarLayoutProps>(
  (
    {
      primaryParticipant,
      sidebarParticipants,
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
          "flex h-full min-h-0 w-full flex-col gap-2 p-2 sm:flex-row sm:gap-3 sm:p-4",
          className,
        )}
      >
        <div className="min-h-0 min-w-0 flex-1">
          <VideoTile
            participantId={primaryParticipant.id}
            name={primaryParticipant.name}
            avatarUrl={primaryParticipant.avatarUrl}
            isSpeaking={primaryParticipant.isSpeaking}
            isMuted={primaryParticipant.isMuted}
            isVideoOff={primaryParticipant.isVideoOff}
            isLocal={primaryParticipant.isLocal}
            isScreenSharing={primaryParticipant.isScreenSharing}
            connectionState={primaryParticipant.connectionState}
            srcObject={primaryParticipant.srcObject}
            audioOutputDeviceId={audioOutputDeviceId}
            isPinned={pinnedId === primaryParticipant.id}
            onPin={onPin}
            className="h-full"
          />
        </div>

        {sidebarParticipants.length > 0 && (
          <>
            <Filmstrip
              participants={sidebarParticipants}
              audioOutputDeviceId={audioOutputDeviceId}
              pinnedId={pinnedId}
              onPin={onPin}
              className="sm:hidden"
            />

            <div className="hidden w-40 shrink-0 flex-col gap-2 overflow-y-auto sm:flex lg:w-48">
              {sidebarParticipants.map((participant) => (
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
                  className="aspect-video shrink-0"
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
);
SidebarLayout.displayName = "SidebarLayout";
