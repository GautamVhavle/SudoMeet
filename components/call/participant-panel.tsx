"use client";

import * as React from "react";
import { Mic, MicOff, MoreVertical, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { IconButton } from "../ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { usePresence } from "@/hooks/use-presence";
import { useParticipants } from "@/hooks/use-participants";
import type { CallParticipant } from "@/lib/media/types";

interface ParticipantPanelProps {
  meetingId: string;
  /** Live roster from the media provider. Falls back to presence when absent. */
  participants?: CallParticipant[];
  onPinParticipant?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  className?: string;
}

export const ParticipantPanel = React.forwardRef<
  HTMLDivElement,
  ParticipantPanelProps
>(({ meetingId, participants: liveParticipants, onPinParticipant, onRemoveParticipant, className }, ref) => {
  const { participantList: presenceList, localParticipantId } = usePresence(meetingId);
  const { participantList, activeSpeakerId, isRoomLocked } = useParticipants();
  const [pinnedIds, setPinnedIds] = React.useState<Set<string>>(new Set());

  // Merge presence data with participant metadata
  const presenceParticipants = presenceList.map((presence) => {
    const metadata = participantList.find((p) => p.id === presence.participantId);
    return {
      id: presence.participantId,
      name: presence.displayName,
      role: presence.role,
      isMuted: !presence.isMicrophoneEnabled,
      isCameraOn: presence.isCameraEnabled,
      isScreenSharing: presence.isScreenSharing,
      handRaised: presence.handRaised,
      isSpeaking: metadata?.isSpeaking || false,
      isActiveSpeaker: activeSpeakerId === presence.participantId,
      connectionState: presence.connectionState,
      isLocal: presence.participantId === localParticipantId,
      isPinned: pinnedIds.has(presence.participantId),
    };
  });

  const participants = liveParticipants
    ? liveParticipants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        role: participant.isLocal ? "host" : "participant",
        isMuted: !participant.isMicrophoneEnabled,
        isCameraOn: participant.isCameraEnabled,
        isScreenSharing: participant.isScreenSharing,
        handRaised: false,
        isSpeaking: false,
        isActiveSpeaker: activeSpeakerId === participant.id,
        connectionState: participant.connectionState ?? "connected",
        isLocal: participant.isLocal,
        isPinned: pinnedIds.has(participant.id),
      }))
    : presenceParticipants;

  const handlePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    onPinParticipant?.(id);
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full flex-col bg-background-elevated",
        className
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Participants ({participants.length})
          </h2>
          {isRoomLocked && (
            <Badge variant="default" className="text-xs">
              Locked
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-background-subtle",
              participant.isActiveSpeaker && "bg-accent/10 ring-1 ring-accent/20"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {initials(participant.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {participant.name}
                </p>
                {participant.role === "host" && (
                  <Badge variant="default" className="text-xs">
                    Host
                  </Badge>
                )}
              </div>
              {participant.isSpeaking && (
                <Badge variant="accent" className="text-xs mt-1">
                  Speaking
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {participant.handRaised && (
                <Hand className="h-4 w-4 text-warning fill-warning/20" />
              )}

              {participant.isMuted ? (
                <MicOff className="h-4 w-4 text-destructive" />
              ) : (
                <Mic className="h-4 w-4 text-success" />
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handlePin(participant.id)}
                  >
                    {participant.isPinned ? "Unpin" : "Pin"} participant
                  </DropdownMenuItem>
                  {!participant.isLocal && (
                    <DropdownMenuItem
                      onClick={() => onRemoveParticipant?.(participant.id)}
                      className="text-destructive"
                    >
                      Remove from call
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
ParticipantPanel.displayName = "ParticipantPanel";
