"use client";

import { useState, useEffect } from "react";

export type NetworkQuality = "excellent" | "good" | "weak" | "unstable" | "unknown";

export interface NetworkCheckState {
  quality: NetworkQuality;
  rtt: number | null;
  checking: boolean;
}

/**
 * Basic connectivity check using RTCPeerConnection against a STUN server.
 * Measures RTT and classifies network quality.
 */
export function useNetworkCheck() {
  const [state, setState] = useState<NetworkCheckState>({
    quality: "unknown",
    rtt: null,
    checking: true,
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        setState((prev) => ({ ...prev, checking: true }));

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        const startTime = performance.now();

        // Create data channel to trigger ICE gathering
        pc.createDataChannel("probe");

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE candidate to measure RTT
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("ICE gathering timeout"));
          }, 5000);

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              clearTimeout(timeout);
              resolve();
            }
          };

          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              resolve();
            }
          };
        });

        const rtt = performance.now() - startTime;
        pc.close();

        if (cancelled) return;

        const quality = classifyQuality(rtt);
        setState({ quality, rtt, checking: false });
      } catch (err) {
        if (cancelled) return;
        console.warn("Network check failed:", err);
        setState({ quality: "unknown", rtt: null, checking: false });
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function classifyQuality(rtt: number): NetworkQuality {
  if (rtt < 100) return "excellent";
  if (rtt < 200) return "good";
  if (rtt < 400) return "weak";
  return "unstable";
}
