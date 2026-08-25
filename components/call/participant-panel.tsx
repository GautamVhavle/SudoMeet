"use client";

import * as React from "react";
import { Mic, MicOff, Pin, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { IconButton } from "../ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";

interface Participant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isLocal?: boolean;
  isPinned?: boolean;
}

interface ParticipantPanelProps {
  participants: Participant[];
  onPinParticipant?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  className?: string;
}

export const ParticipantPanel = React.forwardRef<
  HTMLDivElement,
  ParticipantPanelProps
>(({ participants, onPinParticipant, onRemoveParticipant, className }, ref) => {
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
        "flex flex-col h-full bg-background-elevated border-l border-border",
        className
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">
          Participants ({participants.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-background-subtle",
              participant.isSpeaking && "bg-accent/5"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={participant.avatarUrl} alt={participant.name} />
              <AvatarFallback className="text-xs">
                {initials(participant.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {participant.name}
                {participant.isLocal && " (You)"}
              </p>
              {participant.isSpeaking && (
                <Badge variant="accent" className="text-xs mt-1">
                  Speaking
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {participant.isMuted ? (
                <MicOff className="h-4 w-4 text-destructive" />
              ) : (
                <Mic className="h-4 w-4 text-success" />
              )}

              {participant.isPinned && (
                <Pin className="h-4 w-4 text-accent" />
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
                    onClick={() => onPinParticipant?.(participant.id)}
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
