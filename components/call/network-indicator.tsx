"use client";

import * as React from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NetworkQuality } from "@/hooks/use-network-check";

interface NetworkIndicatorProps {
  quality: NetworkQuality;
  rtt: number | null;
  checking?: boolean;
  className?: string;
}

const qualityConfig: Record<
  NetworkQuality,
  { label: string; color: string; icon: typeof Wifi }
> = {
  excellent: { label: "Excellent", color: "text-green-500", icon: Wifi },
  good: { label: "Good", color: "text-green-400", icon: Wifi },
  weak: { label: "Weak", color: "text-yellow-500", icon: Wifi },
  unstable: { label: "Unstable", color: "text-orange-500", icon: Wifi },
  unknown: { label: "Unknown", color: "text-muted-foreground", icon: WifiOff },
};

/**
 * Network quality indicator based on RTCPeerConnection probe.
 */
export function NetworkIndicator({
  quality,
  rtt,
  checking = false,
  className,
}: NetworkIndicatorProps) {
  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2",
        className
      )}
    >
      <Icon className={cn("h-4 w-4", config.color)} />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {checking ? "Checking..." : config.label}
        </p>
        {rtt !== null && !checking && (
          <p className="font-mono text-xs text-muted-foreground">{rtt.toFixed(0)}ms RTT</p>
        )}
      </div>
    </div>
  );
}
