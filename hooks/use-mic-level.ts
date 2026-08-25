"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Measure microphone input level using WebAudio AnalyserNode.
 * Returns normalized level 0.0–1.0.
 */
export function useMicLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setLevel(0);
      return;
    }

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Compute RMS level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalized = Math.min(rms / 128, 1.0); // Normalize to 0-1

        setLevel(normalized);
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        analyserRef.current = null;
        source.disconnect();
        audioContext.close();
      };
    } catch (err) {
      console.warn("Failed to create audio analyser:", err);
      setLevel(0);
    }
  }, [stream]);

  return level;
}
