/**
 * Breakout rooms panel — manage breakout rooms during a call.
 *
 * Features:
 * - Create breakout rooms
 * - Assign participants
 * - Broadcast messages
 * - Countdown timer
 * - Return to main room
 * - Host-only controls
 *
 * Phase 12: Recording and breakout rooms.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBreakout } from "@/hooks/use-breakout";

export interface BreakoutPanelProps {
  meetingId: string;
  isHost: boolean;
}

export function BreakoutPanel({ meetingId, isHost }: BreakoutPanelProps) {
  const {
    rooms,
    activeBreakoutId,
    countdownSeconds,
    lastBroadcast,
    isLoading,
    error,
    createBreakout,
    broadcast,
    returnToMain,
  } = useBreakout({ meetingId });

  const [newRoomName, setNewRoomName] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [countdownValue, setCountdownValue] = useState(60);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    await createBreakout(newRoomName.trim());
    setNewRoomName("");
  };

  const handleBroadcastMessage = async () => {
    if (!broadcastMessage.trim()) return;
    await broadcast({
      type: "message",
      payload: { message: broadcastMessage.trim() },
    });
    setBroadcastMessage("");
  };

  const handleStartCountdown = async () => {
    await broadcast({
      type: "countdown",
      payload: { seconds: countdownValue },
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold text-zinc-100">Breakout Rooms</h2>

      {/* Host controls */}
      {isHost && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <h3 className="text-sm font-medium text-zinc-300">Host Controls</h3>

          {/* Create room */}
          <div className="flex gap-2">
            <Input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button onClick={handleCreateRoom} disabled={isLoading} size="sm">
              Create
            </Button>
          </div>

          {/* Broadcast message */}
          <div className="flex gap-2">
            <Input
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Broadcast message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button onClick={handleBroadcastMessage} disabled={isLoading} size="sm" variant="outline">
              Send
            </Button>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={countdownValue}
              onChange={(e) => setCountdownValue(Number(e.target.value))}
              min={10}
              max={600}
              className="w-20"
              disabled={isLoading}
            />
            <span className="text-sm text-zinc-400">seconds</span>
            <Button onClick={handleStartCountdown} disabled={isLoading} size="sm" variant="outline">
              Start Countdown
            </Button>
          </div>

          {/* Return all */}
          <Button onClick={returnToMain} disabled={isLoading} variant="destructive" size="sm">
            Return All to Main Room
          </Button>
        </div>
      )}

      {/* Countdown display */}
      {countdownSeconds !== null && countdownSeconds > 0 && (
        <div className="rounded-lg bg-amber-500/10 p-3 text-center">
          <p className="text-sm text-amber-300">
            Returning to main room in <span className="font-bold">{countdownSeconds}s</span>
          </p>
        </div>
      )}

      {/* Last broadcast */}
      {lastBroadcast && (
        <div className="rounded-lg bg-blue-500/10 p-3">
          <p className="text-sm text-blue-300">{lastBroadcast}</p>
        </div>
      )}

      {/* Room list */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {rooms.length === 0 ? (
          <p className="text-sm text-zinc-500">No breakout rooms yet</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className={`rounded-lg border p-3 ${
                room.id === activeBreakoutId
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-100">{room.name}</p>
                  <p className="text-sm text-zinc-400">
                    {room.participantCount} participant{room.participantCount !== 1 ? "s" : ""}
                    {room.capacity > 0 && ` / ${room.capacity} max`}
                  </p>
                </div>
                {room.id === activeBreakoutId && (
                  <span className="rounded-full bg-blue-500 px-2 py-1 text-xs text-white">
                    Active
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error display */}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
