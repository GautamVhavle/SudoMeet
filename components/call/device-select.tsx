"use client";

import * as React from "react";
import { Camera, Mic, Volume2, Video, Mic as MicIcon, VideoOff, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { MediaDeviceInfo } from "@/hooks/use-devices";

interface DeviceSelectProps {
  kind: "camera" | "microphone" | "speaker";
  devices: MediaDeviceInfo[];
  selectedId: string | null;
  onSelect: (deviceId: string) => void;
  enabled?: boolean;
  onToggle?: () => void;
  className?: string;
}

const kindConfig = {
  camera: { label: "Camera", icon: Camera, iconOff: VideoOff, iconEnabled: Video },
  microphone: { label: "Microphone", icon: Mic, iconOff: MicOff, iconEnabled: MicIcon },
  speaker: { label: "Speaker", icon: Volume2, iconOff: Volume2, iconEnabled: Volume2 },
};

/**
 * Device selector with optional enable/disable toggle.
 */
export function DeviceSelect({
  kind,
  devices,
  selectedId,
  onSelect,
  enabled = true,
  onToggle,
  className,
}: DeviceSelectProps) {
  const config = kindConfig[kind];
  const Icon = config.icon;
  const ToggleIcon = enabled ? config.iconEnabled : config.iconOff;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <select
        value={selectedId || ""}
        onChange={(e) => onSelect(e.target.value)}
        disabled={devices.length === 0}
        className={cn(
          "flex-1 h-10 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {devices.length === 0 ? (
          <option value="">No {kind}s found</option>
        ) : (
          devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))
        )}
      </select>
      {onToggle && (
        <Button
          variant={enabled ? "default" : "secondary"}
          size="icon"
          onClick={onToggle}
          className="h-9 w-9 shrink-0"
        >
          <ToggleIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
