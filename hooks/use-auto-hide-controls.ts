/**
 * Auto-hide controls hook — shows controls on movement/interaction, hides after inactivity.
 *
 * Behavior (as per Phase 10 plan):
 *   - Show on mouse movement
 *   - Show on keyboard interaction
 *   - Never hide while menu/dialog is open
 *   - Mobile controls remain accessible
 */

"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const show = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    if (!hasOpenMenu) {
      setIsVisible(false);
    }
  }, [hasOpenMenu]);

  const toggle = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const resetTimeout = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!enabled || hasOpenMenu) {
      return;
    }

    const newTimeoutId = setTimeout(() => {
      hide();
    }, hideDelay);

    setTimeoutId(newTimeoutId);
  }, [timeoutId, enabled, hasOpenMenu, hide, hideDelay]);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    // Show controls on mouse movement
    const handleMouseMove = () => {
      show();
      resetTimeout();
    };

    // Show controls on keyboard interaction
    const handleKeyDown = () => {
      show();
      resetTimeout();
    };

    // Show controls on touch (mobile)
    const handleTouchStart = () => {
      show();
      resetTimeout();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchstart", handleTouchStart);

    // Initial timeout
    resetTimeout();

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchstart", handleTouchStart);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, show, resetTimeout, timeoutId]);

  // Keep controls visible when menu is open
  useEffect(() => {
    if (hasOpenMenu) {
      show();
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    } else {
      resetTimeout();
    }
  }, [hasOpenMenu, show, resetTimeout, timeoutId]);

  return {
    isVisible,
    show,
    hide,
    toggle,
  };
}
