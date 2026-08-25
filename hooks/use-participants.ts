/**
 * Participants hook — manages participant list and metadata.
 *
 * Provides participant actions (add/remove/update), active speaker tracking,
 * and join/leave announcements.
 */

"use client";

import { useParticipantsStore } from "@/stores/participants";

export function useParticipants() {
  const {
    participants,
    activeSpeakerId,
    recentActions,
    isRoomLocked,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setActiveSpeaker,
    setRoomLocked,
    reset,
  } = useParticipantsStore();

  return {
    /** Map of all participants */
    participants,

    /** Participant list as array */
    participantList: Array.from(participants.values()),

    /** Currently active speaker ID */
    activeSpeakerId,

    /** Active speaker participant */
    activeSpeaker: activeSpeakerId ? participants.get(activeSpeakerId) : null,

    /** Recent join/leave/speaking actions */
    recentActions,

    /** Room locked state */
    isRoomLocked,

    /** Add a participant */
    addParticipant,

    /** Remove a participant */
    removeParticipant,

    /** Update participant metadata */
    updateParticipant,

    /** Set active speaker */
    setActiveSpeaker,

    /** Lock/unlock room */
    lockRoom: () => setRoomLocked(true),
    unlockRoom: () => setRoomLocked(false),

    /** Get participant by ID */
    getParticipant: (id: string) => participants.get(id),

    /** Get local participant */
    getLocalParticipant: () => {
      return Array.from(participants.values()).find((p) => p.isLocal);
    },

    /** Get participant count */
    count: participants.size,

    /** Reset all state */
    reset,
  };
}
