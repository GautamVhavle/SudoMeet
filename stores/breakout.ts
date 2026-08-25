/**
 * Breakout room store (Zustand) — breakout room state management.
 *
 * Features:
 * - Breakout room list
 * - Participant assignments
 * - Active breakout tracking
 * - Countdown timer
 * - Broadcast messages
 *
 * Phase 12: Recording and breakout rooms.
 */

import { create } from "zustand";
import type { BreakoutRoom, BreakoutAssignment } from "@/lib/breakout";

export interface BreakoutState {
  /** All breakout rooms for the meeting */
  rooms: BreakoutRoom[];
  /** Current assignments */
  assignments: BreakoutAssignment[];
  /** Active breakout room (for current participant) */
  activeBreakoutId: string | null;
  /** Countdown timer (seconds remaining) */
  countdownSeconds: number | null;
  /** Last broadcast message */
  lastBroadcast: string | null;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error that occurred */
  error: string | null;

  // Actions
  setRooms: (rooms: BreakoutRoom[]) => void;
  addRoom: (room: BreakoutRoom) => void;
  setAssignments: (assignments: BreakoutAssignment[]) => void;
  setActiveBreakout: (breakoutId: string | null) => void;
  setCountdown: (seconds: number | null) => void;
  setBroadcast: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  rooms: [],
  assignments: [],
  activeBreakoutId: null,
  countdownSeconds: null,
  lastBroadcast: null,
  isLoading: false,
  error: null,
};

export const useBreakoutStore = create<BreakoutState>((set) => ({
  ...initialState,

  setRooms: (rooms) => set({ rooms }),

  addRoom: (room) =>
    set((state) => ({
      rooms: [...state.rooms, room],
    })),

  setAssignments: (assignments) => set({ assignments }),

  setActiveBreakout: (breakoutId) => set({ activeBreakoutId: breakoutId }),

  setCountdown: (seconds) => set({ countdownSeconds: seconds }),

  setBroadcast: (message) => set({ lastBroadcast: message }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
