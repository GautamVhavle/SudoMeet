"use client";

import { useState, useEffect, useCallback } from "react";

export type DeviceKind = "audioinput" | "videoinput" | "audiooutput";

export interface MediaDeviceInfo {
  deviceId: string;
  kind: DeviceKind;
  label: string;
  groupId: string;
}

export interface DeviceState {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
  selectedCamera: string | null;
  selectedMicrophone: string | null;
  selectedSpeaker: string | null;
  permissionState: "granted" | "denied" | "prompt" | "unknown";
  loading: boolean;
  error: string | null;
}

const STORAGE_KEYS = {
  camera: "sudomeet.device.camera",
  microphone: "sudomeet.device.microphone",
  speaker: "sudomeet.device.speaker",
} as const;

/**
 * Enumerate media devices and track selection state.
 * Persists selections to localStorage for convenience.
 */
export function useDevices() {
  const [state, setState] = useState<DeviceState>({
    cameras: [],
    microphones: [],
    speakers: [],
    selectedCamera: null,
    selectedMicrophone: null,
    selectedSpeaker: null,
    permissionState: "unknown",
    loading: true,
    error: null,
  });

  const enumerateDevices = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      if (!navigator.mediaDevices?.enumerateDevices) {
        throw new Error("Media devices API not supported");
      }

      const devices = await navigator.mediaDevices.enumerateDevices();

      const cameras = devices
        .filter((d) => d.kind === "videoinput")
        .map(normalizeDevice);
      const microphones = devices
        .filter((d) => d.kind === "audioinput")
        .map(normalizeDevice);
      const speakers = devices
        .filter((d) => d.kind === "audiooutput")
        .map(normalizeDevice);

      // Restore persisted selections or use first available
      const savedCamera = localStorage.getItem(STORAGE_KEYS.camera);
      const savedMicrophone = localStorage.getItem(STORAGE_KEYS.microphone);
      const savedSpeaker = localStorage.getItem(STORAGE_KEYS.speaker);

      const selectedCamera =
        cameras.find((c) => c.deviceId === savedCamera)?.deviceId ??
        cameras[0]?.deviceId ??
        null;
      const selectedMicrophone =
        microphones.find((m) => m.deviceId === savedMicrophone)?.deviceId ??
        microphones[0]?.deviceId ??
        null;
      const selectedSpeaker =
        speakers.find((s) => s.deviceId === savedSpeaker)?.deviceId ??
        speakers[0]?.deviceId ??
        null;

      setState({
        cameras,
        microphones,
        speakers,
        selectedCamera,
        selectedMicrophone,
        selectedSpeaker,
        permissionState: cameras[0]?.label ? "granted" : "prompt",
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to enumerate devices",
      }));
    }
  }, []);

  useEffect(() => {
    enumerateDevices();

    // Re-enumerate when devices change (plug/unplug)
    navigator.mediaDevices?.addEventListener("devicechange", enumerateDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", enumerateDevices);
    };
  }, [enumerateDevices]);

  const selectCamera = useCallback((deviceId: string) => {
    setState((prev) => ({ ...prev, selectedCamera: deviceId }));
    localStorage.setItem(STORAGE_KEYS.camera, deviceId);
  }, []);

  const selectMicrophone = useCallback((deviceId: string) => {
    setState((prev) => ({ ...prev, selectedMicrophone: deviceId }));
    localStorage.setItem(STORAGE_KEYS.microphone, deviceId);
  }, []);

  const selectSpeaker = useCallback((deviceId: string) => {
    setState((prev) => ({ ...prev, selectedSpeaker: deviceId }));
    localStorage.setItem(STORAGE_KEYS.speaker, deviceId);
  }, []);

  return {
    ...state,
    selectCamera,
    selectMicrophone,
    selectSpeaker,
    refresh: enumerateDevices,
  };
}

function normalizeDevice(device: MediaDeviceInfo): MediaDeviceInfo {
  return {
    deviceId: device.deviceId,
    kind: device.kind as DeviceKind,
    label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
    groupId: device.groupId,
  };
}
