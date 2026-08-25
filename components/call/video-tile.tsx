"use client";

import * as React from "react";
import { MicOff, VideoOff, MonitorUp, Pin, Loader2 } from "lucide-react";
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
  isScreenSharing?: boolean;
  isPinned?: boolean;
  connectionState?: "connecting" | "connected" | "reconnecting" | "failed";
  /** Live MediaStream for this participant. */
  srcObject?: MediaStream | null;
  /** Output device for remote audio (setSinkId, Chromium only). */
  audioOutputDeviceId?: string | null;
  onPin?: (participantId: string) => void;
  className?: string;
}

/**
 * Attaches a MediaStream to a media element.
 *
 * The element must never be conditionally unmounted: the audio track shares the
 * stream with the video, so tearing the element down when the camera is off
 * also silences the participant. Camera-off is a CSS concern only.
 */
function useMediaElement<T extends HTMLMediaElement>(
  srcObject: MediaStream | null | undefined,
) {
  const ref = React.useRef<T | null>(null);

  const apply = React.useCallback((element: T | null, stream: MediaStream | null) => {
    if (!element) return;
    if (element.srcObject !== stream) {
      element.srcObject = stream;
    }
    // Autoplay may be rejected until the user interacts; retry silently.
    const played = element.play();
    if (played) played.catch(() => {});
  }, []);

  // Ref callback covers remount (where an effect keyed on the stream wouldn't
  // re-run and the tile would stay black).
  const attach = React.useCallback(
    (element: T | null) => {
      ref.current = element;
      apply(element, srcObject ?? null);
    },
    [apply, srcObject],
  );

  React.useEffect(() => {
    apply(ref.current, srcObject ?? null);
  }, [apply, srcObject]);

  return { attach, ref };
}

export const VideoTile = React.forwardRef<HTMLDivElement, VideoTileProps>(
  (
    {
      participantId,
      name,
      avatarUrl,
      isSpeaking = false,
      isMuted = false,
      isVideoOff = false,
      isLocal = false,
      isScreenSharing = false,
      isPinned = false,
      connectionState,
      srcObject,
      audioOutputDeviceId,
      onPin,
      className,
    },
    ref,
  ) => {
    const video = useMediaElement<HTMLVideoElement>(srcObject);
    const audio = useMediaElement<HTMLAudioElement>(isLocal ? null : srcObject);

    const hasVideo = Boolean(
      srcObject && srcObject.getVideoTracks().length > 0 && !isVideoOff,
    );

    // Route remote audio to the selected speaker where supported.
    React.useEffect(() => {
      const element = audio.ref.current as
        | (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> })
        | null;
      if (!element?.setSinkId || !audioOutputDeviceId) return;
      element.setSinkId(audioOutputDeviceId).catch(() => {});
    }, [audio.ref, audioOutputDeviceId, srcObject]);

    const initials =
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";

    const isPending =
      connectionState === "connecting" || connectionState === "reconnecting";

    return (
      <div
        ref={ref}
        data-testid="video-tile"
        className={cn(
          "group relative min-h-0 min-w-0 overflow-hidden rounded-xl border bg-background-subtle transition-all",
          isSpeaking
            ? "border-accent shadow-[0_0_0_2px_var(--accent)]"
            : "border-border",
          className,
        )}
      >
        <div className="relative h-full w-full bg-background-subtle">
          {/* Always mounted — unmounting would kill the audio track too. */}
          <video
            ref={video.attach}
            autoPlay
            playsInline
            muted
            className={cn(
              "h-full w-full object-cover transition-opacity",
              // Mirror your own camera, but never a shared screen.
              isLocal && !isScreenSharing && "-scale-x-100",
              hasVideo ? "opacity-100" : "opacity-0",
            )}
          />

          {/* Remote audio gets its own element so UI state changes can never
              interrupt playback. */}
          {!isLocal && (
            <audio ref={audio.attach} autoPlay playsInline className="hidden" />
          )}

          {!hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar className="h-14 w-14 sm:h-20 sm:w-20">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="bg-muted text-lg sm:text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>

        {onPin && (
          <button
            type="button"
            onClick={() => onPin(participantId)}
            aria-label={isPinned ? `Unpin ${name}` : `Pin ${name}`}
            aria-pressed={isPinned}
            className={cn(
              "absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white transition-opacity",
              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isPinned
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            )}
          >
            <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-current")} />
          </button>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xs font-medium text-white sm:text-sm">
                {name}
                {isLocal && " (You)"}
              </span>
              {isScreenSharing && (
                <Badge
                  variant="secondary"
                  className="hidden shrink-0 items-center gap-1 text-xs sm:flex"
                >
                  <MonitorUp className="h-3 w-3" />
                  Presenting
                </Badge>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isMuted && (
                <div className="rounded-full bg-destructive/90 p-1.5">
                  <MicOff className="h-3 w-3 text-white" />
                </div>
              )}
              {isVideoOff && (
                <div className="rounded-full bg-muted/90 p-1.5">
                  <VideoOff className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
VideoTile.displayName = "VideoTile";
