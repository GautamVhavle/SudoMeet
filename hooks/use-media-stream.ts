"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type MediaStreamError =
  | "permission-denied"
  | "device-not-found"
  | "device-busy"
  | "unknown";

export interface MediaStreamState {
  stream: MediaStream | null;
  enabled: { video: boolean; audio: boolean };
  loading: boolean;
  error: MediaStreamError | null;
}

export interface UseMediaStreamOptions {
  videoDeviceId?: string | null;
  audioDeviceId?: string | null;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
}

const STORAGE_KEYS = {
  videoEnabled: "sudomeet.preview.video",
  audioEnabled: "sudomeet.preview.audio",
} as const;

/**
 * Manage getUserMedia lifecycle with device selection and track enable/disable.
 * Persists video/audio enabled state to localStorage.
 */
export function useMediaStream(options: UseMediaStreamOptions = {}) {
  const {
    videoDeviceId = null,
    audioDeviceId = null,
    videoEnabled: initialVideo = restoreBool(STORAGE_KEYS.videoEnabled, true),
    audioEnabled: initialAudio = restoreBool(STORAGE_KEYS.audioEnabled, true),
  } = options;

  const [state, setState] = useState<MediaStreamState>({
    stream: null,
    enabled: { video: initialVideo, audio: initialAudio },
    loading: false,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(
    async (video: boolean, audio: boolean) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        stopStream();

        if (!video && !audio) {
          setState({
            stream: null,
            enabled: { video: false, audio: false },
            loading: false,
            error: null,
          });
          return;
        }

        const constraints: MediaStreamConstraints = {
          video: video
            ? videoDeviceId
              ? { deviceId: { exact: videoDeviceId } }
              : true
            : false,
          audio: audio
            ? audioDeviceId
              ? { deviceId: { exact: audioDeviceId } }
              : true
            : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        setState({
          stream,
          enabled: { video, audio },
          loading: false,
          error: null,
        });
      } catch (err) {
        const error = classifyMediaError(err);
        setState((prev) => ({
          ...prev,
          stream: null,
          loading: false,
          error,
        }));
      }
    },
    [videoDeviceId, audioDeviceId, stopStream]
  );

  // Start stream when enabled states or device IDs change
  useEffect(() => {
    const { video, audio } = state.enabled;
    if (video || audio) {
      startStream(video, audio);
    } else {
      stopStream();
    }
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoDeviceId, audioDeviceId, state.enabled.video, state.enabled.audio]);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enabled: { ...prev.enabled, video: enabled } }));
    localStorage.setItem(STORAGE_KEYS.videoEnabled, String(enabled));
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enabled: { ...prev.enabled, audio: enabled } }));
    localStorage.setItem(STORAGE_KEYS.audioEnabled, String(enabled));
  }, []);

  const toggleVideo = useCallback(() => {
    setVideoEnabled(!state.enabled.video);
  }, [state.enabled.video, setVideoEnabled]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled(!state.enabled.audio);
  }, [state.enabled.audio, setAudioEnabled]);

  return {
    ...state,
    setVideoEnabled,
    setAudioEnabled,
    toggleVideo,
    toggleAudio,
    retry: () => startStream(state.enabled.video, state.enabled.audio),
  };
}

function classifyMediaError(err: unknown): MediaStreamError {
  if (!(err instanceof Error)) return "unknown";

  const name = (err as DOMException).name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "permission-denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "device-not-found";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "device-busy";
  }
  return "unknown";
}

function restoreBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? defaultValue : stored === "true";
  } catch {
    return defaultValue;
  }
}
