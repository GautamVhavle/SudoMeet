/**
 * Presence store — tracks who's in the room with heartbeat management.
 *
 * Separate from participants store to isolate ephemeral presence state
 * from persistent participant data.
 */

import { create } from "zustand";

import type { PresenceData } from "@/lib/redis/presence";
import {
  HEARTBEAT_INTERVAL_MS,
  removePresence,
  sendHeartbeat,
  setPresence,
  updatePresenceState,
} from "@/lib/redis/presence";

interface PresenceStore {
  /** All active participants in the current meeting */
  participants: Map<string, PresenceData>;

  /** Local participant ID */
  localParticipantId: string | null;

  /** Heartbeat interval timer */
  heartbeatInterval: NodeJS.Timeout | null;

  /** Actions */
  joinMeeting: (meetingId: string, data: PresenceData) => Promise<void>;
  leaveMeeting: (meetingId: string, participantId: string) => Promise<void>;
  updateLocalState: (
    meetingId: string,
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
  ) => Promise<void>;
  updateParticipant: (participantId: string, data: Partial<PresenceData>) => void;
  setParticipants: (participants: PresenceData[]) => void;
  removeParticipant: (participantId: string) => void;
  startHeartbeat: (meetingId: string, participantId: string) => void;
  stopHeartbeat: () => void;
  reset: () => void;
}

export const usePresenceStore = create<PresenceStore>((set, get) => ({
  participants: new Map(),
  localParticipantId: null,
  heartbeatInterval: null,

  joinMeeting: async (meetingId: string, data: PresenceData) => {
    await setPresence(meetingId, data);
    set({
      localParticipantId: data.participantId,
      participants: new Map(get().participants).set(data.participantId, data),
    });

    // Start heartbeat
    get().startHeartbeat(meetingId, data.participantId);
  },

  leaveMeeting: async (meetingId: string, participantId: string) => {
    get().stopHeartbeat();
    await removePresence(meetingId, participantId);
    
    const participants = new Map(get().participants);
    participants.delete(participantId);
    set({ participants, localParticipantId: null });
  },

  updateLocalState: async (meetingId: string, updates) => {
    const { localParticipantId, participants } = get();
    if (!localParticipantId) return;

    await updatePresenceState(meetingId, localParticipantId, updates);

    const existing = participants.get(localParticipantId);
    if (existing) {
      const updated = new Map(participants);
      updated.set(localParticipantId, { ...existing, ...updates });
      set({ participants: updated });
    }
  },

  updateParticipant: (participantId: string, data: Partial<PresenceData>) => {
    const participants = new Map(get().participants);
    const existing = participants.get(participantId);
    if (existing) {
      participants.set(participantId, { ...existing, ...data });
      set({ participants });
    }
  },

  setParticipants: (participantList: PresenceData[]) => {
    const participants = new Map(
      participantList.map((p) => [p.participantId, p]),
    );
    set({ participants });
  },

  removeParticipant: (participantId: string) => {
    const participants = new Map(get().participants);
    participants.delete(participantId);
    set({ participants });
  },

  startHeartbeat: (meetingId: string, participantId: string) => {
    // Clear existing interval if any
    get().stopHeartbeat();

    const interval = setInterval(() => {
      sendHeartbeat(meetingId, participantId).catch((error) => {
        console.error("[presence] Heartbeat failed:", error);
      });
    }, HEARTBEAT_INTERVAL_MS);

    set({ heartbeatInterval: interval });
  },

  stopHeartbeat: () => {
    const { heartbeatInterval } = get();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      set({ heartbeatInterval: null });
    }
  },

  reset: () => {
    get().stopHeartbeat();
    set({
      participants: new Map(),
      localParticipantId: null,
      heartbeatInterval: null,
    });
  },
}));
