"use client";

import * as React from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicLevelMeterProps {
  level: number; // 0.0–1.0 normalized level
  className?: string;
}

/**
 * Visual microphone level indicator with WebAudio-driven animation.
 */
export function MicLevelMeter({ level, className }: MicLevelMeterProps) {
  const bars = 12;
  const activeBars = Math.round(level * bars);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Mic className="h-4 w-4 text-muted-foreground" />
      <div className="flex h-5 items-end gap-0.5">
        {Array.from({ length: bars }).map((_, i) => {
          const isActive = i < activeBars;
          const height = ((i + 1) / bars) * 100;

          return (
            <div
              key={i}
              className={cn(
                "w-1 rounded-sm transition-colors",
                isActive ? "bg-accent" : "bg-muted"
              )}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
