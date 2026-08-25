"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

import { VideoGrid, type GridParticipant } from "@/components/call/video-grid";
import { SpotlightLayout } from "@/components/call/spotlight-layout";
import { SidebarLayout } from "@/components/call/sidebar-layout";
import { CallControlBar } from "@/components/call/call-control-bar";
import { ParticipantPanel } from "@/components/call/participant-panel";
import { ChatPanel } from "@/components/call/chat-panel";
import { ConnectionIndicator } from "@/components/call/connection-indicator";
import { StatsOverlay } from "@/components/call/stats-overlay";
import { ReactionLayer } from "@/components/call/reaction-layer";
import { LayoutSwitcher } from "@/components/call/layout-switcher";
import { CallSettingsDialog } from "@/components/call/call-settings-dialog";
import { InviteButton, InviteDialog } from "@/components/call/invite-dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useLayoutStore } from "@/stores/layout";
import { useAutoHideControls } from "@/hooks/use-auto-hide-controls";
import { useDevices } from "@/hooks/use-devices";
import { useP2PMesh } from "@/hooks/use-p2p-mesh";
import type { WebRTCStats } from "@/lib/media/types";
import { cn } from "@/lib/utils";

interface CallShellProps {
  meetingId: string;
  roomCode: string;
  title: string;
  localParticipantId: string;
  localParticipantName: string;
  isHost: boolean;
}

const PREFS_KEY = "sudomeet.join-prefs";

function readJoinPrefs(): { muted: boolean; cameraOff: boolean } {
  if (typeof window === "undefined") return { muted: false, cameraOff: false };
  try {
    const raw = sessionStorage.getItem(PREFS_KEY);
    if (!raw) return { muted: false, cameraOff: false };
    const parsed = JSON.parse(raw) as { muted?: boolean; cameraOff?: boolean };
    return { muted: Boolean(parsed.muted), cameraOff: Boolean(parsed.cameraOff) };
  } catch {
    return { muted: false, cameraOff: false };
  }
}

export function CallShell({
  meetingId,
  roomCode,
  title,
  localParticipantId,
  localParticipantName,
}: CallShellProps) {
  const router = useRouter();

  // Kept in a ref, never rendered directly: sessionStorage is unavailable on
  // the server, so rendering from it would break hydration. These only seed
  // the initial track state.
  const joinPrefsRef = React.useRef<{ muted: boolean; cameraOff: boolean } | null>(
    null,
  );
  joinPrefsRef.current ??= readJoinPrefs();
  const joinPrefs = joinPrefsRef.current;

  const [showChat, setShowChat] = React.useState(false);
  const [showParticipants, setShowParticipants] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showInvite, setShowInvite] = React.useState(false);
  const [stats, setStats] = React.useState<WebRTCStats>({});

  const devices = useDevices();

  const layoutMode = useLayoutStore((state) => state.mode);
  const setLayoutMode = useLayoutStore((state) => state.setMode);
  const localPin = useLayoutStore((state) => state.localPin);
  const setLocalPin = useLayoutStore((state) => state.setLocalPin);

  const mesh = useP2PMesh({
    meetingId,
    localParticipantId,
    localParticipantName,
    audioDeviceId: devices.selectedMicrophone,
    videoDeviceId: devices.selectedCamera,
    startMuted: joinPrefs.muted,
    startCameraOff: joinPrefs.cameraOff,
    autoConnect: true,
  });

  const {
    participants,
    localStream,
    remoteStreams,
    isConnected,
    isConnecting,
    signalConnected,
    error,
    connect,
    disconnect,
    setMicrophoneEnabled,
    setCameraEnabled,
    startScreenShare,
    stopScreenShare,
    switchDevices,
    getStats,
  } = mesh;

  const localParticipant = participants.find((p) => p.isLocal);
  const isMuted = localParticipant ? !localParticipant.isMicrophoneEnabled : false;
  const isVideoOff = localParticipant ? !localParticipant.isCameraEnabled : false;
  const isScreenSharing = Boolean(localParticipant?.isScreenSharing);

  const anyPanelOpen = showChat || showParticipants || showSettings || showInvite;

  // Auto-hide only where a mouse can bring the controls back. On touch there is
  // no mousemove, so hiding the bar can strand the user with no way to mute or
  // leave the call.
  const [autoHideEnabled, setAutoHideEnabled] = React.useState(false);
  React.useEffect(() => {
    setAutoHideEnabled(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const { isVisible: controlsVisible } = useAutoHideControls({
    enabled: autoHideEnabled,
    hasOpenMenu: anyPanelOpen,
  });

  // Attach the right stream to each participant.
  const tiles = React.useMemo<GridParticipant[]>(
    () =>
      participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        isMuted: !participant.isMicrophoneEnabled,
        isVideoOff: !participant.isCameraEnabled,
        isLocal: participant.isLocal,
        isScreenSharing: participant.isScreenSharing,
        connectionState: participant.connectionState,
        srcObject: participant.isLocal
          ? localStream
          : (remoteStreams.get(participant.id) ?? null),
      })),
    [participants, localStream, remoteStreams],
  );

  // A screen share should take over the main stage automatically.
  const presenter = tiles.find((tile) => tile.isScreenSharing);
  React.useEffect(() => {
    if (presenter && layoutMode === "grid") setLayoutMode("sidebar");
  }, [presenter, layoutMode, setLayoutMode]);

  const spotlightId =
    presenter?.id ?? localPin ?? tiles.find((t) => !t.isLocal)?.id ?? tiles[0]?.id;
  const spotlightTile = tiles.find((tile) => tile.id === spotlightId);
  const otherTiles = tiles.filter((tile) => tile.id !== spotlightId);

  React.useEffect(() => {
    if (!showStats) return;
    let cancelled = false;
    const tick = async () => {
      const next = await getStats();
      if (!cancelled) setStats(next);
    };
    void tick();
    const interval = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [showStats, getStats]);

  const handleEndCall = React.useCallback(async () => {
    await disconnect();
    router.push(`/m/${roomCode}`);
  }, [disconnect, router, roomCode]);

  const handleToggleScreenShare = React.useCallback(async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch {
      // User dismissed the picker — nothing to do.
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const handlePin = React.useCallback(
    (participantId: string) => {
      setLocalPin(localPin === participantId ? null : participantId);
      if (localPin !== participantId) setLayoutMode("sidebar");
    },
    [localPin, setLocalPin, setLayoutMode],
  );

  // Probed after mount: reading `navigator` during render makes the server and
  // client markup disagree and throws away the hydrated tree.
  const [canScreenShare, setCanScreenShare] = React.useState(false);
  React.useEffect(() => {
    setCanScreenShare(
      typeof navigator.mediaDevices?.getDisplayMedia === "function",
    );
  }, []);

  const connectionQuality: "excellent" | "good" | "poor" | "disconnected" =
    !signalConnected || !isConnected
      ? "disconnected"
      : participants.some((p) => p.connectionState === "reconnecting")
        ? "poor"
        : "excellent";

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Can&apos;t start your devices
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => void connect()}>Try again</Button>
            <Button variant="outline" onClick={() => router.push(`/m/${roomCode}`)}>
              Back to lobby
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div
        className={cn(
          "absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-2 transition-opacity duration-300 sm:left-4 sm:right-4 sm:top-4",
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="min-w-0 rounded-lg bg-background-elevated/80 px-3 py-1.5 backdrop-blur">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="font-mono text-xs text-muted-foreground">/m/{roomCode}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InviteButton onClick={() => setShowInvite(true)} />
          <div className="hidden sm:block">
            <LayoutSwitcher />
          </div>
          <ConnectionIndicator quality={connectionQuality} />
        </div>
      </div>

      <InviteDialog
        roomCode={roomCode}
        title={title}
        open={showInvite}
        onOpenChange={setShowInvite}
      />

      <StatsOverlay stats={stats} isVisible={showStats} />
      <ReactionLayer meetingId={meetingId} />

      {/* Stage + panels */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-h-0 min-w-0 flex-1">
          {isConnecting && tiles.length === 0 ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Connecting…
            </div>
          ) : layoutMode === "spotlight" && spotlightTile ? (
            <SpotlightLayout
              activeParticipant={spotlightTile}
              otherParticipants={otherTiles}
              audioOutputDeviceId={devices.selectedSpeaker}
              pinnedId={localPin}
              onPin={handlePin}
            />
          ) : layoutMode === "sidebar" && spotlightTile ? (
            <SidebarLayout
              primaryParticipant={spotlightTile}
              sidebarParticipants={otherTiles}
              audioOutputDeviceId={devices.selectedSpeaker}
              pinnedId={localPin}
              onPin={handlePin}
            />
          ) : (
            <VideoGrid
              participants={tiles}
              audioOutputDeviceId={devices.selectedSpeaker}
              pinnedId={localPin}
              onPin={handlePin}
            />
          )}
        </div>

        {/* Panels dock beside the stage on desktop and overlay on mobile so
            they never squeeze the video into an unusable sliver. */}
        {showChat && (
          <SidePanel title="Chat" onClose={() => setShowChat(false)}>
            <ChatPanel
              meetingId={meetingId}
              currentUser={{
                id: localParticipantId,
                name: localParticipantName,
                image: null,
              }}
              className="h-full"
            />
          </SidePanel>
        )}

        {showParticipants && (
          <SidePanel title="Participants" onClose={() => setShowParticipants(false)}>
            <ParticipantPanel
              meetingId={meetingId}
              participants={participants}
              onPinParticipant={handlePin}
              className="h-full"
            />
          </SidePanel>
        )}
      </div>

      <div
        className={cn(
          "shrink-0 transition-transform duration-300",
          controlsVisible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <CallControlBar
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          canScreenShare={canScreenShare}
          participantCount={participants.length}
          onToggleMute={() => void setMicrophoneEnabled(isMuted)}
          onToggleVideo={() => void setCameraEnabled(isVideoOff)}
          onToggleScreenShare={() => void handleToggleScreenShare()}
          onEndCall={() => void handleEndCall()}
          onOpenSettings={() => setShowSettings(true)}
          onToggleChat={() => {
            setShowChat((prev) => !prev);
            setShowParticipants(false);
          }}
          onToggleParticipants={() => {
            setShowParticipants((prev) => !prev);
            setShowChat(false);
          }}
        />
      </div>

      <CallSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        devices={devices}
        localStream={localStream}
        onChangeCamera={(deviceId) => {
          devices.selectCamera(deviceId);
          void switchDevices({ videoDeviceId: deviceId });
        }}
        onChangeMicrophone={(deviceId) => {
          devices.selectMicrophone(deviceId);
          void switchDevices({ audioDeviceId: deviceId });
        }}
        onChangeSpeaker={devices.selectSpeaker}
        showStats={showStats}
        onToggleStats={setShowStats}
        getStats={getStats}
      />
    </div>
  );
}

function SidePanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label={title}
      className={cn(
        "absolute inset-0 z-30 flex flex-col border-border bg-background",
        "sm:relative sm:inset-auto sm:z-auto sm:w-80 sm:shrink-0 sm:border-l",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={`Close ${title.toLowerCase()}`}
        >
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </aside>
  );
}
