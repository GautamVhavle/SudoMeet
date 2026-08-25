"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoGrid } from "@/components/call/video-grid";
import { CallControlBar } from "@/components/call/call-control-bar";
import { ParticipantPanel } from "@/components/call/participant-panel";
import { ChatPanel } from "@/components/call/chat-panel";
import { ConnectionIndicator } from "@/components/call/connection-indicator";
import { StatsOverlay } from "@/components/call/stats-overlay";
import { ReactionLayer } from "@/components/call/reaction-layer";

/**
 * /m/[roomCode]/call — Full call UI with MOCK DATA (Phase 5).
 * Real media provider wiring arrives in Phases 6-7.
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

  // Get meeting ID from room code (in real app, would fetch from API)
  // For now, use roomCode as meetingId placeholder
  const meetingId = params.roomCode as string;

  // Mock participants data (Phase 5)
  const mockParticipants = [
    {
      id: "1",
      name: "You",
      avatarUrl: undefined,
      isSpeaking: false,
      isMuted: isMuted,
      isVideoOff: isVideoOff,
      isLocal: true,
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
      srcObject: null,
    },
  ];

  // Mock chat messages
  const mockMessages = [
    {
      id: "1",
      senderId: "2",
      senderName: "Alice Johnson",
      message: "Hey everyone! Great to be here.",
      timestamp: new Date(Date.now() - 300000),
      isLocal: false,
    },
    {
      id: "2",
      senderId: "1",
      senderName: "You",
      message: "Hi Alice! Thanks for joining.",
      timestamp: new Date(Date.now() - 240000),
      isLocal: true,
    },
    {
      id: "3",
      senderId: "3",
      senderName: "Bob Smith",
      message: "Can you all hear me okay?",
      timestamp: new Date(Date.now() - 120000),
      isLocal: false,
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

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar with connection indicator and stats */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <ConnectionIndicator quality="excellent" />
      </div>

      <StatsOverlay stats={mockStats} isVisible={showStats} />
      
      <ReactionLayer meetingId={meetingId} />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 relative">
          <VideoGrid participants={mockParticipants} />
        </div>

        {/* Side panels */}
        {showChat && (
          <div className="w-80">
            <ChatPanel
              messages={mockMessages}
              onSendMessage={(msg) => console.log("Send:", msg)}
            />
          </div>
        )}

        {showParticipants && (
          <div className="w-80">
            <ParticipantPanel
              meetingId={meetingId}
              onPinParticipant={(id) => console.log("Pin:", id)}
              onRemoveParticipant={(id) => console.log("Remove:", id)}
            />
          </div>
        )}
      </div>

      {/* Control bar */}
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
  );
}

