"use client";

import * as React from "react";
import { MicOff, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";

interface VideoTileProps {
  participantId: string;
  name: string;
  avatarUrl?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isLocal?: boolean;
  /** Mock video element or null for Phase 5; real MediaStream in Phase 6+ */
  srcObject?: MediaStream | null;
  className?: string;
}

export const VideoTile = React.forwardRef<HTMLDivElement, VideoTileProps>(
  (
    {
      participantId: _participantId,
      name,
      avatarUrl,
      isSpeaking = false,
      isMuted = false,
      isVideoOff = false,
      isLocal = false,
      srcObject,
      className,
    },
    ref
  ) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
      if (videoRef.current && srcObject) {
        videoRef.current.srcObject = srcObject;
      }
    }, [srcObject]);

    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-xl bg-background-subtle border transition-all",
          isSpeaking
            ? "border-accent shadow-[0_0_0_2px_var(--accent)]"
            : "border-border",
          className
        )}
      >
        {/* Video or Avatar */}
        <div className="relative aspect-video w-full bg-background-subtle">
          {!isVideoOff && srcObject ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="bg-muted text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>

        {/* Overlay info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {name}
                {isLocal && " (You)"}
              </span>
              {isSpeaking && (
                <Badge variant="accent" className="text-xs">
                  Speaking
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isMuted && (
                <div className="rounded-lg bg-destructive/20 p-1">
                  <MicOff className="h-3 w-3 text-destructive" />
                </div>
              )}
              {isVideoOff && (
                <div className="rounded-lg bg-destructive/20 p-1">
                  <VideoOff className="h-3 w-3 text-destructive" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
VideoTile.displayName = "VideoTile";
