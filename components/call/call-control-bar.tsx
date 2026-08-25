"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Settings,
  MessageSquare,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "../ui/icon-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface CallControlBarProps {
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
  onEndCall?: () => void;
  onOpenSettings?: () => void;
  onToggleChat?: () => void;
  onToggleParticipants?: () => void;
  className?: string;
}

export const CallControlBar = React.forwardRef<
  HTMLDivElement,
  CallControlBarProps
>(
  (
    {
      isMuted = false,
      isVideoOff = false,
      isScreenSharing = false,
      onToggleMute,
      onToggleVideo,
      onToggleScreenShare,
      onEndCall,
      onOpenSettings,
      onToggleChat,
      onToggleParticipants,
      className,
    },
    ref
  ) => {
    return (
      <TooltipProvider>
        <div
          ref={ref}
          className={cn(
            "flex items-center justify-center gap-3 bg-background-elevated border-t border-border px-6 py-4",
            className
          )}
        >
          {/* Primary controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant={isMuted ? "destructive" : "secondary"}
                  size="lg"
                  onClick={onToggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isMuted ? "Unmute" : "Mute"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant={isVideoOff ? "destructive" : "secondary"}
                  size="lg"
                  onClick={onToggleVideo}
                  aria-label={isVideoOff ? "Start video" : "Stop video"}
                >
                  {isVideoOff ? (
                    <VideoOff className="h-5 w-5" />
                  ) : (
                    <Video className="h-5 w-5" />
                  )}
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isVideoOff ? "Start video" : "Stop video"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant={isScreenSharing ? "accent" : "secondary"}
                  size="lg"
                  onClick={onToggleScreenShare}
                  aria-label={
                    isScreenSharing ? "Stop sharing" : "Share screen"
                  }
                >
                  <MonitorUp className="h-5 w-5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isScreenSharing ? "Stop sharing" : "Share screen"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* End call (prominent) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                variant="destructive"
                size="lg"
                onClick={onEndCall}
                aria-label="End call"
                className="mx-2"
              >
                <PhoneOff className="h-5 w-5" />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>End call</p>
            </TooltipContent>
          </Tooltip>

          {/* Secondary controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="lg"
                  onClick={onToggleChat}
                  aria-label="Chat"
                >
                  <MessageSquare className="h-5 w-5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chat</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="lg"
                  onClick={onToggleParticipants}
                  aria-label="Participants"
                >
                  <Users className="h-5 w-5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Participants</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="lg"
                  onClick={onOpenSettings}
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  }
);
CallControlBar.displayName = "CallControlBar";
