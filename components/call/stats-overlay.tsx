"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

interface CallStats {
  bitrate?: string;
  packetLoss?: string;
  latency?: string;
  resolution?: string;
  fps?: number;
}

interface StatsOverlayProps {
  stats: CallStats;
  isVisible?: boolean;
  className?: string;
}

export const StatsOverlay = React.forwardRef<
  HTMLDivElement,
  StatsOverlayProps
>(({ stats, isVisible = false, className }, ref) => {
  if (!isVisible) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-4 left-4 bg-background-elevated/90 backdrop-blur-sm border border-border rounded-xl p-3 font-mono text-xs space-y-1.5",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 text-accent" />
        <span className="font-semibold">Call Stats</span>
      </div>

      {stats.resolution && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Resolution:</span>
          <span>{stats.resolution}</span>
        </div>
      )}

      {stats.fps !== undefined && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">FPS:</span>
          <span>{stats.fps}</span>
        </div>
      )}

      {stats.bitrate && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Bitrate:</span>
          <span>{stats.bitrate}</span>
        </div>
      )}

      {stats.latency && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Latency:</span>
          <Badge
            variant={
              parseInt(stats.latency) < 100
                ? "success"
                : parseInt(stats.latency) < 200
                ? "warning"
                : "destructive"
            }
            className="text-xs"
          >
            {stats.latency}
          </Badge>
        </div>
      )}

      {stats.packetLoss && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Packet Loss:</span>
          <Badge
            variant={
              parseFloat(stats.packetLoss) < 1
                ? "success"
                : parseFloat(stats.packetLoss) < 3
                ? "warning"
                : "destructive"
            }
            className="text-xs"
          >
            {stats.packetLoss}
          </Badge>
        </div>
      )}
    </div>
  );
});
StatsOverlay.displayName = "StatsOverlay";
