"use client";

import * as React from "react";
import { Camera, Mic, Volume2, Activity } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MicLevelMeter } from "@/components/call/mic-level-meter";
import { useMicLevel } from "@/hooks/use-mic-level";
import type { DeviceState } from "@/hooks/use-devices";
import type { WebRTCStats } from "@/lib/media/types";

interface CallSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: DeviceState & {
    selectCamera: (id: string) => void;
    selectMicrophone: (id: string) => void;
    selectSpeaker: (id: string) => void;
    refresh: () => void;
  };
  localStream: MediaStream | null;
  onChangeCamera: (deviceId: string) => void;
  onChangeMicrophone: (deviceId: string) => void;
  onChangeSpeaker: (deviceId: string) => void;
  showStats: boolean;
  onToggleStats: (next: boolean) => void;
  getStats: () => Promise<WebRTCStats>;
}

/**
 * In-call settings. The gear button previously only toggled the stats overlay,
 * so there was no way to change devices once you were in a call.
 */
export function CallSettingsDialog({
  open,
  onOpenChange,
  devices,
  localStream,
  onChangeCamera,
  onChangeMicrophone,
  onChangeSpeaker,
  showStats,
  onToggleStats,
  getStats,
}: CallSettingsDialogProps) {
  const micLevel = useMicLevel(localStream);
  const [stats, setStats] = React.useState<WebRTCStats>({});
  const previewRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    devices.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    const element = previewRef.current;
    if (!element || !open) return;
    if (element.srcObject !== localStream) {
      element.srcObject = localStream;
    }
    element.play().catch(() => {});
  }, [localStream, open]);

  React.useEffect(() => {
    if (!open) return;
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
  }, [open, getStats]);

  const supportsSpeakerSelection =
    typeof window !== "undefined" &&
    "setSinkId" in HTMLMediaElement.prototype;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Choose your devices and check your connection.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="devices">
          <TabsList className="w-full">
            <TabsTrigger value="devices" className="flex-1">
              Devices
            </TabsTrigger>
            <TabsTrigger value="connection" className="flex-1">
              Connection
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-5 pt-4">
            <div className="overflow-hidden rounded-lg border border-border bg-background-subtle">
              <video
                ref={previewRef}
                autoPlay
                playsInline
                muted
                className="aspect-video w-full -scale-x-100 object-cover"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-camera"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Camera className="size-4" /> Camera
              </label>
              <Select
                value={devices.selectedCamera ?? undefined}
                onValueChange={onChangeCamera}
              >
                <SelectTrigger id="settings-camera">
                  <SelectValue placeholder="Select a camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.cameras.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-mic"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Mic className="size-4" /> Microphone
              </label>
              <Select
                value={devices.selectedMicrophone ?? undefined}
                onValueChange={onChangeMicrophone}
              >
                <SelectTrigger id="settings-mic">
                  <SelectValue placeholder="Select a microphone" />
                </SelectTrigger>
                <SelectContent>
                  {devices.microphones.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MicLevelMeter level={micLevel} />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-speaker"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Volume2 className="size-4" /> Speaker
              </label>
              <Select
                value={devices.selectedSpeaker ?? undefined}
                onValueChange={onChangeSpeaker}
                disabled={!supportsSpeakerSelection}
              >
                <SelectTrigger id="settings-speaker">
                  <SelectValue placeholder="Select a speaker" />
                </SelectTrigger>
                <SelectContent>
                  {devices.speakers.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!supportsSpeakerSelection && (
                <p className="text-xs text-muted-foreground">
                  Your browser uses the system default output device.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connection" className="space-y-4 pt-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onToggleStats(!showStats)}
            >
              <Activity className="mr-2 size-4" />
              {showStats ? "Hide" : "Show"} stats overlay
            </Button>

            <dl className="space-y-2 rounded-lg border border-border bg-background-subtle p-4 font-mono text-sm">
              <StatRow label="bitrate" value={stats.bitrate} />
              <StatRow label="packet loss" value={stats.packetLoss} />
              <StatRow label="latency" value={stats.latency ?? stats.rtt} />
              <StatRow label="resolution" value={stats.resolution} />
              <StatRow
                label="fps"
                value={stats.fps ? String(stats.fps) : undefined}
              />
              <StatRow label="codec" value={stats.codec} />
              <StatRow label="candidate" value={stats.connectionType} />
            </dl>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{value ?? "—"}</dd>
    </div>
  );
}
