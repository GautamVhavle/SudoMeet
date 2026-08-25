/**
 * Presence hook — manages participant presence with heartbeat lifecycle.
 *
 * Automatically starts heartbeat on join and cleans up on leave/unmount.
 */

"use client";

import { useEffect } from "react";

import { getActiveParticipants, type PresenceData } from "@/lib/redis/presence";
import { usePresenceStore } from "@/stores/presence";

export function usePresence(meetingId: string | null) {
  const {
    participants,
    localParticipantId,
    joinMeeting,
    leaveMeeting,
    updateLocalState,
    setParticipants,
    updateParticipant,
    removeParticipant,
    reset,
  } = usePresenceStore();

  // Fetch and sync active participants periodically
  useEffect(() => {
    if (!meetingId) return;

    let mounted = true;

    async function syncParticipants() {
      if (!meetingId || !mounted) return;
      
      try {
        const active = await getActiveParticipants(meetingId);
        if (mounted) {
          setParticipants(active);
        }
      } catch (error) {
        console.error("[usePresence] Failed to sync participants:", error);
      }
    }

    // Initial sync
    syncParticipants();

    // Sync every 5 seconds
    const interval = setInterval(syncParticipants, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [meetingId, setParticipants]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return {
    /** Map of all active participants */
    participants,

    /** Local participant ID */
    localParticipantId,

    /** Participant list as array */
    participantList: Array.from(participants.values()),

    /** Join meeting and start heartbeat */
    join: (data: PresenceData) => {
      if (!meetingId) return Promise.reject(new Error("No meeting ID"));
      return joinMeeting(meetingId, data);
    },

    /** Leave meeting and stop heartbeat */
    leave: (participantId: string) => {
      if (!meetingId) return Promise.reject(new Error("No meeting ID"));
      return leaveMeeting(meetingId, participantId);
    },

    /** Update local participant state (mute/video/hand/etc) */
    updateLocal: (
      updates: Partial<
        Pick<
          PresenceData,
          | "isMicrophoneEnabled"
          | "isCameraEnabled"
          | "isScreenSharing"
          | "handRaised"
          | "connectionState"
        >
      >,
    ) => {
      if (!meetingId) return Promise.reject(new Error("No meeting ID"));
      return updateLocalState(meetingId, updates);
    },

    /** Update a participant (for remote updates via signaling) */
    updateParticipant,

    /** Remove a participant (when they leave) */
    removeParticipant,

    /** Get participant by ID */
    getParticipant: (id: string) => participants.get(id),

    /** Check if local participant is host */
    isLocalHost: () => {
      if (!localParticipantId) return false;
      const local = participants.get(localParticipantId);
      return local?.role === "host";
    },
  };
}
