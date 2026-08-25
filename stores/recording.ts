/**
 * Recording store (Zustand) — meeting recording state management.
 *
 * Features:
 * - Start/stop recording
 * - Recording status tracking
 * - Recording history
 *
 * Phase 12: Recording and breakout rooms.
 */

import { create } from "zustand";
import type { RecordingStatus, RecordingMetadata } from "@/lib/recording";

export interface RecordingState {
  /** Current recording status */
  status: RecordingStatus | null;
  /** Active recording egress ID (for stopping) */
  egressId: string | null;
  /** Recording metadata (when available) */
  metadata: RecordingMetadata | null;
  /** Recording history for the meeting */
  history: RecordingMetadata[];
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error that occurred */
  error: string | null;

  // Actions
  setStatus: (status: RecordingStatus | null) => void;
  setEgressId: (egressId: string | null) => void;
  setMetadata: (metadata: RecordingMetadata | null) => void;
  setHistory: (history: RecordingMetadata[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: null,
  egressId: null,
  metadata: null,
  history: [],
  isLoading: false,
  error: null,
};

export const useRecordingStore = create<RecordingState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setEgressId: (egressId) => set({ egressId }),
  setMetadata: (metadata) => set({ metadata }),
  setHistory: (history) => set({ history }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
