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
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "../ui/icon-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface CallControlBarProps {
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  canScreenShare?: boolean;
  participantCount?: number;
  unreadCount?: number;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
  onEndCall?: () => void;
  onOpenSettings?: () => void;
  onToggleChat?: () => void;
  onToggleParticipants?: () => void;
  className?: string;
}

/**
 * Bottom control bar.
 *
 * Sized to fit a small phone without horizontal scrolling: buttons shrink at
 * the `sm` breakpoint and the secondary actions collapse into an overflow menu.
 * Bottom padding respects the iOS home indicator via safe-area insets.
 */
export const CallControlBar = React.forwardRef<HTMLDivElement, CallControlBarProps>(
  (
    {
      isMuted = false,
      isVideoOff = false,
      isScreenSharing = false,
      canScreenShare = true,
      participantCount,
      unreadCount = 0,
      onToggleMute,
      onToggleVideo,
      onToggleScreenShare,
      onEndCall,
      onOpenSettings,
      onToggleChat,
      onToggleParticipants,
      className,
    },
    ref,
  ) => {
    return (
      <TooltipProvider delayDuration={300}>
        <div
          ref={ref}
          data-testid="call-control-bar"
          className={cn(
            "flex w-full shrink-0 items-center justify-center gap-1.5 border-t border-border bg-background-elevated px-2 py-2 sm:gap-3 sm:px-6 sm:py-4",
            "pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-4",
            className,
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                variant={isMuted ? "destructive" : "secondary"}
                size="default"
                onClick={onToggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                aria-pressed={isMuted}
                className="size-10 sm:size-12"
              >
                {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                variant={isVideoOff ? "destructive" : "secondary"}
                size="default"
                onClick={onToggleVideo}
                aria-label={isVideoOff ? "Start video" : "Stop video"}
                aria-pressed={isVideoOff}
                className="size-10 sm:size-12"
              >
                {isVideoOff ? (
                  <VideoOff className="size-5" />
                ) : (
                  <Video className="size-5" />
                )}
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{isVideoOff ? "Start video" : "Stop video"}</TooltipContent>
          </Tooltip>

          {/* Screen share is unavailable on most mobile browsers. */}
          {canScreenShare && (
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant={isScreenSharing ? "accent" : "secondary"}
                  size="default"
                  onClick={onToggleScreenShare}
                  aria-label={isScreenSharing ? "Stop sharing" : "Share screen"}
                  aria-pressed={isScreenSharing}
                  className="hidden size-10 sm:inline-flex sm:size-12"
                >
                  <MonitorUp className="size-5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>
                {isScreenSharing ? "Stop sharing" : "Share screen"}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                variant="destructive"
                size="default"
                onClick={onEndCall}
                aria-label="Leave call"
                className="size-10 sm:mx-2 sm:size-12"
              >
                <PhoneOff className="size-5" />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>Leave call</TooltipContent>
          </Tooltip>

          {/* Secondary controls: inline on tablet+, overflow menu on phones. */}
          <div className="hidden items-center gap-1.5 sm:flex sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="default"
                  onClick={onToggleChat}
                  aria-label="Chat"
                  className="relative size-10 sm:size-12"
                >
                  <MessageSquare className="size-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>Chat</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="default"
                  onClick={onToggleParticipants}
                  aria-label={`Participants${participantCount ? ` (${participantCount})` : ""}`}
                  className="relative size-10 sm:size-12"
                >
                  <Users className="size-5" />
                  {typeof participantCount === "number" && participantCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold text-foreground">
                      {participantCount}
                    </span>
                  )}
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>Participants</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="default"
                  onClick={onOpenSettings}
                  aria-label="Settings"
                  className="size-10 sm:size-12"
                >
                  <Settings className="size-5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                variant="ghost"
                size="default"
                aria-label="More options"
                className="size-10 sm:hidden"
              >
                <MoreHorizontal className="size-5" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="mb-2">
              <DropdownMenuItem onSelect={() => onToggleChat?.()}>
                <MessageSquare className="mr-2 size-4" />
                Chat
                {unreadCount > 0 && (
                  <span className="ml-auto text-xs text-accent">{unreadCount}</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onToggleParticipants?.()}>
                <Users className="mr-2 size-4" />
                Participants
                {typeof participantCount === "number" && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {participantCount}
                  </span>
                )}
              </DropdownMenuItem>
              {canScreenShare && (
                <DropdownMenuItem onSelect={() => onToggleScreenShare?.()}>
                  <MonitorUp className="mr-2 size-4" />
                  {isScreenSharing ? "Stop sharing" : "Share screen"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => onOpenSettings?.()}>
                <Settings className="mr-2 size-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
    );
  },
);
CallControlBar.displayName = "CallControlBar";
