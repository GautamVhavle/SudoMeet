/**
 * Layout store — manages call layout state and participant pinning.
 *
 * Supports three layouts:
 *   - grid: balanced grid of all participants
 *   - spotlight: primary participant + filmstrip
 *   - sidebar: large content area + vertical sidebar
 *
 * Pin model (as per Phase 10 plan):
 *   - localPin: user's manually pinned participant
 *   - hostSpotlight: host-assigned spotlight (future)
 *   - screenSharePriority: screen share takes precedence
 *   - activeSpeaker: fallback to active speaker
 */

import { create } from "zustand";

export type LayoutMode = "grid" | "spotlight" | "sidebar";

interface LayoutStore {
  /** Current layout mode */
  mode: LayoutMode;

  /** User's manually pinned participant ID */
  localPin: string | null;

  /** Host-assigned spotlight participant ID (Phase 11+) */
  hostSpotlight: string | null;

  /** Whether controls are currently visible */
  controlsVisible: boolean;

  /** Actions */
  setMode: (mode: LayoutMode) => void;
  setLocalPin: (participantId: string | null) => void;
  setHostSpotlight: (participantId: string | null) => void;
  setControlsVisible: (visible: boolean) => void;
  reset: () => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  mode: "grid",
  localPin: null,
  hostSpotlight: null,
  controlsVisible: true,

  setMode: (mode: LayoutMode) => {
    set({ mode });
  },

  setLocalPin: (participantId: string | null) => {
    set({ localPin: participantId });
  },

  setHostSpotlight: (participantId: string | null) => {
    set({ hostSpotlight: participantId });
  },

  setControlsVisible: (visible: boolean) => {
    set({ controlsVisible: visible });
  },

  reset: () => {
    set({
      mode: "grid",
      localPin: null,
      hostSpotlight: null,
      controlsVisible: true,
    });
  },
}));

/**
 * Compute the effective spotlight participant based on priority:
 *   1. Screen share (highest priority)
 *   2. Local pin
 *   3. Host spotlight
 *   4. Active speaker
 *   5. First participant
 */
export function getSpotlightParticipant(
  participants: Array<{ id: string; isScreenSharing?: boolean }>,
  activeSpeakerId: string | null,
  localPin: string | null,
  hostSpotlight: string | null,
): string | null {
  if (participants.length === 0) return null;

  // Priority 1: Screen share
  const screenSharer = participants.find((p) => p.isScreenSharing);
  if (screenSharer) return screenSharer.id;

  // Priority 2: Local pin
  if (localPin && participants.some((p) => p.id === localPin)) {
    return localPin;
  }

  // Priority 3: Host spotlight
  if (hostSpotlight && participants.some((p) => p.id === hostSpotlight)) {
    return hostSpotlight;
  }

  // Priority 4: Active speaker
  if (activeSpeakerId && participants.some((p) => p.id === activeSpeakerId)) {
    return activeSpeakerId;
  }

  // Priority 5: First participant
  return participants[0].id;
}
