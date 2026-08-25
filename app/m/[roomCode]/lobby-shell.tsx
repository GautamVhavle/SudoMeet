"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuestIdentity } from "@/lib/validation/auth";
import { VideoTile } from "@/components/call/video-tile";
import { DeviceSelect } from "@/components/call/device-select";
import { MicLevelMeter } from "@/components/call/mic-level-meter";
import { NetworkIndicator } from "@/components/call/network-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDevices } from "@/hooks/use-devices";
import { useMediaStream } from "@/hooks/use-media-stream";
import { useMicLevel } from "@/hooks/use-mic-level";
import { useNetworkCheck } from "@/hooks/use-network-check";

interface Meeting {
  id: string;
  roomCode: string;
  title: string;
  status: string;
  requiresHostApproval: boolean;
}

interface LobbyShellProps {
  meeting: Meeting;
  userId: string | null;
  guestIdentity: GuestIdentity | null;
  isHost: boolean;
  expired: boolean;
  ended: boolean;
  lockedForGuest: boolean;
}

export function LobbyShell({
  meeting,
  userId,
  guestIdentity,
  isHost,
  expired,
  ended,
  lockedForGuest,
}: LobbyShellProps) {
  if (expired) {
    return (
      <LobbyContainer meeting={meeting} isHost={isHost} userId={userId}>
        <MeetingNotice
          title="This meeting has expired"
          body="The room link is no longer active. Ask the host for a fresh invite."
        />
      </LobbyContainer>
    );
  }

  if (ended) {
    return (
      <LobbyContainer meeting={meeting} isHost={isHost} userId={userId}>
        <MeetingNotice
          title="This meeting has ended"
          body="Thanks for stopping by — the host can start a new meeting anytime."
        />
      </LobbyContainer>
    );
  }

  if (lockedForGuest) {
    return (
      <LobbyContainer meeting={meeting} isHost={isHost} userId={userId}>
        <MeetingNotice
          title="Room locked"
          body="The host has locked this room. You'll need their approval to join."
        />
      </LobbyContainer>
    );
  }

  // Main lobby with device preview
  return (
    <LobbyWithPreview
      meeting={meeting}
      userId={userId}
      guestIdentity={guestIdentity}
      isHost={isHost}
    />
  );
}

function LobbyContainer({
  meeting,
  isHost,
  userId,
  children,
}: {
  meeting: Meeting;
  isHost: boolean;
  userId: string | null;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            SudoMeet · /m/{meeting.roomCode}
          </p>
          <h1 className="text-2xl font-semibold text-foreground">{meeting.title}</h1>

          <dl className="mt-4 space-y-1 font-mono text-sm text-muted-foreground">
            <div className="flex justify-between">
              <dt>status</dt>
              <dd data-testid="meeting-status">{meeting.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt>role</dt>
              <dd>{isHost ? "host" : userId ? "participant" : "guest"}</dd>
            </div>
          </dl>
        </div>
        {children}
      </div>
    </main>
  );
}

function LobbyWithPreview({
  meeting,
  userId,
  guestIdentity,
  isHost,
}: {
  meeting: Meeting;
  userId: string | null;
  guestIdentity: GuestIdentity | null;
  isHost: boolean;
}) {
  const router = useRouter();
  const [guestName, setGuestName] = React.useState(guestIdentity?.displayName || "");
  const [savingGuest, setSavingGuest] = React.useState(false);
  const [guestError, setGuestError] = React.useState<string | null>(null);

  const devices = useDevices();
  const media = useMediaStream({
    videoDeviceId: devices.selectedCamera,
    audioDeviceId: devices.selectedMicrophone,
  });
  const micLevel = useMicLevel(media.stream);
  const network = useNetworkCheck();

  const handleJoin = async () => {
    // If guest without name, save identity first
    if (!userId && !guestIdentity) {
      if (!guestName.trim()) {
        setGuestError("Please enter your name");
        return;
      }

      try {
        setSavingGuest(true);
        setGuestError(null);

        const response = await fetch("/api/auth/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: guestName.trim() }),
        });

        if (!response.ok) {
          const data = await response.json();
          setGuestError(data.error || "Failed to save guest identity");
          return;
        }

        // Cookie is now set, proceed to call
        router.push(`/m/${meeting.roomCode}/call`);
      } catch {
        setGuestError("Network error — please try again");
      } finally {
        setSavingGuest(false);
      }
    } else {
      // Authenticated or existing guest — go straight to call
      router.push(`/m/${meeting.roomCode}/call`);
    }
  };

  return (
    <LobbyContainer meeting={meeting} isHost={isHost} userId={userId}>
      <div className="space-y-4">
        {/* Guest name entry */}
        {!userId && !guestIdentity && (
          <div className="rounded-lg border border-border bg-card p-4">
            <label htmlFor="guest-name" className="block text-sm font-medium text-foreground mb-2">
              Enter your name
            </label>
            <Input
              id="guest-name"
              type="text"
              placeholder="Your display name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              maxLength={50}
              className="w-full"
            />
            {guestError && (
              <p className="mt-2 text-sm text-destructive">{guestError}</p>
            )}
          </div>
        )}

        {/* Preview area */}
        <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-background-subtle">
          {media.loading ? (
            <Skeleton className="h-full w-full" />
          ) : media.error ? (
            <MediaErrorDisplay error={media.error} onRetry={media.retry} />
          ) : (
            <VideoTile
              participantId="preview"
              name={userId ? "You" : guestIdentity?.displayName || guestName || "Guest"}
              isLocal
              isMuted={!media.enabled.audio}
              isVideoOff={!media.enabled.video}
              srcObject={media.stream}
              className="h-full w-full"
            />
          )}
        </div>

        {/* Device controls */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <DeviceSelect
            kind="camera"
            devices={devices.cameras}
            selectedId={devices.selectedCamera}
            onSelect={devices.selectCamera}
            enabled={media.enabled.video}
            onToggle={media.toggleVideo}
          />
          <DeviceSelect
            kind="microphone"
            devices={devices.microphones}
            selectedId={devices.selectedMicrophone}
            onSelect={devices.selectMicrophone}
            enabled={media.enabled.audio}
            onToggle={media.toggleAudio}
          />
          <DeviceSelect
            kind="speaker"
            devices={devices.speakers}
            selectedId={devices.selectedSpeaker}
            onSelect={devices.selectSpeaker}
          />

          {/* Mic level meter */}
          {media.enabled.audio && media.stream && (
            <MicLevelMeter level={micLevel} className="mt-2" />
          )}
        </div>

        {/* Network check */}
        <NetworkIndicator
          quality={network.quality}
          rtt={network.rtt}
          checking={network.checking}
        />

        {/* Host approval notice */}
        {!isHost && meeting.requiresHostApproval && (
          <p className="rounded border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            This room requires host approval — you&apos;ll wait in the lobby after joining.
          </p>
        )}

        {/* Join button */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleJoin}
            disabled={savingGuest || (!userId && !guestIdentity && !guestName.trim())}
            className="w-full"
            size="lg"
            data-testid="join-call-link"
          >
            {savingGuest ? "Saving..." : isHost ? "Start call" : "Join call"}
          </Button>
          {!userId && (
            <p className="text-center text-xs text-muted-foreground">
              Joining as guest —{" "}
              <Link href="/login" className="underline underline-offset-2">
                sign in instead
              </Link>
            </p>
          )}
        </div>
      </div>
    </LobbyContainer>
  );
}

function MeetingNotice({ title, body }: { title: string; body: string }) {
  return (
    <div
      data-testid="meeting-unavailable"
      className="rounded-md border border-border bg-muted px-4 py-3"
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function MediaErrorDisplay({
  error,
  onRetry,
}: {
  error: "permission-denied" | "device-not-found" | "device-busy" | "unknown";
  onRetry: () => void;
}) {
  const messages = {
    "permission-denied": {
      title: "Camera or microphone access denied",
      body: "Grant permission in your browser settings to preview your devices.",
    },
    "device-not-found": {
      title: "No camera or microphone found",
      body: "Connect a camera or microphone to preview your setup.",
    },
    "device-busy": {
      title: "Device is busy",
      body: "Another application may be using your camera or microphone. Close it and try again.",
    },
    unknown: {
      title: "Failed to access media devices",
      body: "An unexpected error occurred. Check your browser permissions and try again.",
    },
  };

  const message = messages[error];

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorState title={message.title} message={message.body}>
        <Button onClick={onRetry} variant="secondary" size="sm">
          Try again
        </Button>
      </ErrorState>
    </div>
  );
}
