"use client";

import * as React from "react";
import { Volume2 } from "lucide-react";

import { DeviceSelect } from "@/components/call/device-select";
import { MicLevelMeter } from "@/components/call/mic-level-meter";
import { Button } from "@/components/ui/button";
import { useDevices } from "@/hooks/use-devices";
import { useMediaStream } from "@/hooks/use-media-stream";
import { useMicLevel } from "@/hooks/use-mic-level";

/**
 * Device picker with live preview. Selections persist to localStorage via
 * useDevices and are what the lobby and call pages read on start.
 */
export function DeviceSettings() {
  const devices = useDevices();
  const media = useMediaStream({
    videoDeviceId: devices.selectedCamera,
    audioDeviceId: devices.selectedMicrophone,
  });
  const micLevel = useMicLevel(media.stream);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (element.srcObject !== media.stream) {
      element.srcObject = media.stream;
    }
    element.play().catch(() => {});
  }, [media.stream]);

  // Release the camera when leaving the page.
  React.useEffect(() => () => media.stop(), [media]);

  const testSpeaker = React.useCallback(async () => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.frequency.value = 440;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
    oscillator.onended = () => void context.close();
  }, []);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-background-subtle">
        {media.error ? (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {media.error === "permission-denied"
                ? "Camera and microphone access is blocked. Allow permission in your browser settings."
                : media.error === "device-not-found"
                  ? "No camera or microphone found."
                  : media.error === "device-busy"
                    ? "Your camera is in use by another app."
                    : "Could not start your devices."}
            </p>
            <Button variant="outline" size="sm" onClick={media.retry}>
              Retry
            </Button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full -scale-x-100 object-cover"
          />
        )}
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
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
        <MicLevelMeter level={micLevel} />
        <DeviceSelect
          kind="speaker"
          devices={devices.speakers}
          selectedId={devices.selectedSpeaker}
          onSelect={devices.selectSpeaker}
        />
        <Button variant="outline" size="sm" onClick={() => void testSpeaker()}>
          <Volume2 className="mr-2 size-4" />
          Test speaker
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        These choices are saved on this device and used for every meeting you join.
      </p>
    </div>
  );
}
