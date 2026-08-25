"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoGrid } from "@/components/call/video-grid";
import { SpotlightLayout } from "@/components/call/spotlight-layout";
import { SidebarLayout } from "@/components/call/sidebar-layout";
import { CallControlBar } from "@/components/call/call-control-bar";
import { ParticipantPanel } from "@/components/call/participant-panel";
import { ChatPanel } from "@/components/call/chat-panel";
import { ConnectionIndicator } from "@/components/call/connection-indicator";
import { StatsOverlay } from "@/components/call/stats-overlay";
import { ReactionLayer } from "@/components/call/reaction-layer";
import { LayoutSwitcher } from "@/components/call/layout-switcher";
import { useLayoutStore, getSpotlightParticipant } from "@/stores/layout";
import { useParticipantsStore } from "@/stores/participants";
import { useAutoHideControls } from "@/hooks/use-auto-hide-controls";
import { cn } from "@/lib/utils";

/**
 * /m/[roomCode]/call — Full call UI with Phase 10 layout system.
 * 
 * Features:
 *   - Grid, spotlight, and sidebar layouts
 *   - Screen share support
 *   - Pin participant to spotlight
 *   - Auto-hide controls
 */

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const [showChat, setShowChat] = React.useState(false);
  const [showParticipants, setShowParticipants] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);

  // Layout state
  const layoutMode = useLayoutStore((state) => state.mode);
  const localPin = useLayoutStore((state) => state.localPin);
  const setLocalPin = useLayoutStore((state) => state.setLocalPin);

  // Get active speaker from participants store
  const activeSpeakerId = useParticipantsStore((state) => state.activeSpeakerId);

  // Auto-hide controls
  const { isVisible: controlsVisible } = useAutoHideControls({
    hasOpenMenu: showChat || showParticipants || showStats,
  });

  // Get meeting ID from room code
  const meetingId = params.roomCode as string;

  // Mock participants data (Phase 5-9; real media in Phase 7+)
  const mockParticipants = [
    {
      id: "1",
      name: "You",
      avatarUrl: undefined,
      isSpeaking: false,
      isMuted: isMuted,
      isVideoOff: isVideoOff,
      isLocal: true,
      isScreenSharing: isScreenSharing,
      srcObject: null,
    },
    {
      id: "2",
      name: "Alice Johnson",
      avatarUrl: undefined,
      isSpeaking: true,
      isMuted: false,
      isVideoOff: false,
      isLocal: false,
      isScreenSharing: false,
      srcObject: null,
    },
    {
      id: "3",
      name: "Bob Smith",
      avatarUrl: undefined,
      isSpeaking: false,
      isMuted: true,
      isVideoOff: false,
      isLocal: false,
      isScreenSharing: false,
      srcObject: null,
    },
  ];

  // Mock call stats
  const mockStats = {
    bitrate: "1.2 Mbps",
    packetLoss: "0.5%",
    latency: "42ms",
    resolution: "1280x720",
    fps: 30,
  };

  const handleEndCall = () => {
    router.push(`/m/${params.roomCode}`);
  };

  const handlePinParticipant = (participantId: string) => {
    // Toggle pin: if already pinned, unpin; otherwise pin
    setLocalPin(localPin === participantId ? null : participantId);
  };

  // Determine spotlight participant based on priority
  const spotlightParticipantId = getSpotlightParticipant(
    mockParticipants,
    activeSpeakerId,
    localPin,
    null // hostSpotlight (Phase 11+)
  );

  // Split participants for spotlight/sidebar layouts
  const spotlightParticipant = mockParticipants.find((p) => p.id === spotlightParticipantId);
  const otherParticipants = mockParticipants.filter((p) => p.id !== spotlightParticipantId);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar with connection indicator, layout switcher, and stats */}
      <div
        className={cn(
          "absolute top-4 right-4 z-10 flex gap-2 transition-opacity duration-300",
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <LayoutSwitcher />
        <ConnectionIndicator quality="excellent" />
      </div>

      <StatsOverlay stats={mockStats} isVisible={showStats} />
      
      <ReactionLayer meetingId={meetingId} />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video layout */}
        <div className="flex-1 relative">
          {layoutMode === "grid" && (
            <VideoGrid participants={mockParticipants} />
          )}

          {layoutMode === "spotlight" && spotlightParticipant && (
            <SpotlightLayout
              activeParticipant={spotlightParticipant}
              otherParticipants={otherParticipants}
            />
          )}

          {layoutMode === "sidebar" && spotlightParticipant && (
            <SidebarLayout
              primaryParticipant={spotlightParticipant}
              sidebarParticipants={otherParticipants}
            />
          )}
        </div>

        {/* Side panels */}
        {showChat && (
          <div className="w-80">
            <ChatPanel
              meetingId={meetingId}
              currentUser={{
                id: "1",
                name: "You",
                image: null,
              }}
            />
          </div>
        )}

        {showParticipants && (
          <div className="w-80">
            <ParticipantPanel
              meetingId={meetingId}
              onPinParticipant={handlePinParticipant}
              onRemoveParticipant={(id) => console.log("Remove:", id)}
            />
          </div>
        )}
      </div>

      {/* Control bar */}
      <div
        className={cn(
          "transition-transform duration-300",
          controlsVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <CallControlBar
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          onToggleMute={() => setIsMuted(!isMuted)}
          onToggleVideo={() => setIsVideoOff(!isVideoOff)}
          onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
          onEndCall={handleEndCall}
          onOpenSettings={() => setShowStats(!showStats)}
          onToggleChat={() => setShowChat(!showChat)}
          onToggleParticipants={() => setShowParticipants(!showParticipants)}
        />
      </div>
    </div>
  );
}

