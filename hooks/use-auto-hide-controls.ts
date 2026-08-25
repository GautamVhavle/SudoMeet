/**
 * Auto-hide controls hook — shows controls on movement/interaction, hides after inactivity.
 *
 * Behavior:
 *   - Show on mouse movement
 *   - Show on keyboard interaction
 *   - Never hide while menu/dialog is open
 *   - Mobile controls remain accessible
 *
 * The pending timer lives in a ref, never in state: keeping it in state made
 * `resetTimeout` change identity on every tick, which re-ran the listener
 * effect and produced an infinite render loop that froze the whole call page.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAutoHideControlsOptions {
  /** Delay in ms before hiding controls (default: 3000) */
  hideDelay?: number;
  /** Whether auto-hide is enabled (default: true) */
  enabled?: boolean;
  /** Whether a menu/dialog is currently open */
  hasOpenMenu?: boolean;
}

export interface UseAutoHideControlsReturn {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

export function useAutoHideControls({
  hideDelay = 3000,
  enabled = true,
  hasOpenMenu = false,
}: UseAutoHideControlsOptions = {}): UseAutoHideControlsReturn {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read inside the timer callback so the callbacks below stay stable.
  const optionsRef = useRef({ hideDelay, enabled, hasOpenMenu });
  optionsRef.current = { hideDelay, enabled, hasOpenMenu };

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const show = useCallback(() => setIsVisible(true), []);

  const hide = useCallback(() => {
    if (!optionsRef.current.hasOpenMenu) setIsVisible(false);
  }, []);

  const toggle = useCallback(() => setIsVisible((prev) => !prev), []);

  const resetTimeout = useCallback(() => {
    clearPending();
    const { enabled: on, hasOpenMenu: menuOpen, hideDelay: delay } = optionsRef.current;
    if (!on || menuOpen) return;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      hide();
    }, delay);
  }, [clearPending, hide]);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      clearPending();
      return;
    }

    const handleActivity = () => {
      show();
      resetTimeout();
    };

    document.addEventListener("mousemove", handleActivity);
    document.addEventListener("keydown", handleActivity);
    document.addEventListener("touchstart", handleActivity);

    resetTimeout();

    return () => {
      document.removeEventListener("mousemove", handleActivity);
      document.removeEventListener("keydown", handleActivity);
      document.removeEventListener("touchstart", handleActivity);
      clearPending();
    };
  }, [enabled, show, resetTimeout, clearPending]);

  // Keep controls visible while a menu or dialog is open.
  useEffect(() => {
    if (hasOpenMenu) {
      show();
      clearPending();
    } else {
      resetTimeout();
    }
  }, [hasOpenMenu, show, resetTimeout, clearPending]);

  return {
    isVisible,
    show,
    hide,
    toggle,
  };
}
