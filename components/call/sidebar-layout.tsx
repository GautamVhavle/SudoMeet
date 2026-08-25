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

interface SidebarLayoutProps {
  primaryParticipant: Participant;
  sidebarParticipants: Participant[];
  className?: string;
}

/**
 * Sidebar layout — large primary content + vertical sidebar filmstrip.
 * 
 * Used for:
 *   - Screen sharing
 *   - Pinned participant
 *   - Spotlight with many participants
 */
export const SidebarLayout = React.forwardRef<HTMLDivElement, SidebarLayoutProps>(
  ({ primaryParticipant, sidebarParticipants, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex h-full w-full gap-3 p-4", className)}
      >
        {/* Primary content area */}
        <div className="flex-1 min-w-0">
          <VideoTile
            participantId={primaryParticipant.id}
            name={primaryParticipant.name}
            avatarUrl={primaryParticipant.avatarUrl}
            isSpeaking={primaryParticipant.isSpeaking}
            isMuted={primaryParticipant.isMuted}
            isVideoOff={primaryParticipant.isVideoOff}
            isLocal={primaryParticipant.isLocal}
            srcObject={primaryParticipant.srcObject}
            className="h-full"
          />
        </div>

        {/* Vertical sidebar filmstrip */}
        {sidebarParticipants.length > 0 && (
          <div className="flex flex-col gap-2 w-48 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-background-subtle">
            {sidebarParticipants.map((participant) => (
              <div key={participant.id} className="flex-shrink-0">
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
        )}
      </div>
    );
  }
);
SidebarLayout.displayName = "SidebarLayout";
