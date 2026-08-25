/**
 * Media state machine — connection lifecycle manager for both P2P and LiveKit.
 *
 * IDLE → REQUESTING_MEDIA → READY → CONNECTING → CONNECTED
 *   ├─→ RECONNECTING → CONNECTED
 *   ├─→ DISCONNECTED
 *   └─→ FAILED
 *
 * Prevents invalid transitions (e.g., IDLE → CONNECTED) and provides typed
 * event callbacks for state changes.
 */

import type { MediaState } from "./types";

type StateChangeCallback = (from: MediaState, to: MediaState) => void;

const VALID_TRANSITIONS: Record<MediaState, MediaState[]> = {
  IDLE: ["REQUESTING_MEDIA"],
  REQUESTING_MEDIA: ["READY", "FAILED"],
  READY: ["CONNECTING", "DISCONNECTED"],
  CONNECTING: ["CONNECTED", "FAILED", "DISCONNECTED"],
  CONNECTED: ["RECONNECTING", "DISCONNECTED"],
  RECONNECTING: ["CONNECTED", "FAILED", "DISCONNECTED"],
  DISCONNECTED: ["IDLE", "REQUESTING_MEDIA"],
  FAILED: ["IDLE", "REQUESTING_MEDIA"],
};

export class MediaStateMachine {
  private currentState: MediaState = "IDLE";
  private listeners: Set<StateChangeCallback> = new Set();

  /**
   * Get the current state.
   */
  getState(): MediaState {
    return this.currentState;
  }

  /**
   * Transition to a new state if valid. Returns true if transition occurred.
   */
  transition(to: MediaState): boolean {
    const from = this.currentState;
    const allowed = VALID_TRANSITIONS[from];

    if (!allowed.includes(to)) {
      console.warn(
        `[MediaStateMachine] Invalid transition: ${from} → ${to}. Allowed: [${allowed.join(", ")}]`,
      );
      return false;
    }

    this.currentState = to;
    this.notify(from, to);
    return true;
  }

  /**
   * Force a state (for error recovery or testing). Bypasses validation.
   */
  forceState(to: MediaState): void {
    const from = this.currentState;
    this.currentState = to;
    this.notify(from, to);
  }

  /**
   * Subscribe to state changes. Returns unsubscribe function.
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Reset to IDLE (e.g., on disconnect).
   */
  reset(): void {
    this.transition("IDLE");
  }

  private notify(from: MediaState, to: MediaState): void {
    this.listeners.forEach((callback) => {
      try {
        callback(from, to);
      } catch (error) {
        console.error("[MediaStateMachine] Listener error:", error);
      }
    });
  }
}
