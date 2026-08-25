/**
 * Participants store — manages participant list state and actions.
 *
 * Tracks participant metadata like display name, role, join/leave events,
 * active speaker, hand raise, etc.
 *
 * Split from presence store: presence = ephemeral heartbeat tracking,
 * participants = durable participant metadata and actions.
 */

import { create } from "zustand";

export interface ParticipantMetadata {
  id: string;
  displayName: string;
  role: "host" | "guest";
  isLocal: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0-1
  joinedAt: number;
  networkQuality: "excellent" | "good" | "fair" | "poor" | "unknown";
}

interface ParticipantAction {
  type: "joined" | "left" | "speaking-started" | "speaking-stopped";
  participantId: string;
  displayName?: string;
  timestamp: number;
}

interface ParticipantsStore {
  /** Participant metadata by ID */
  participants: Map<string, ParticipantMetadata>;

  /** Currently active speaker ID (most recent/loudest) */
  activeSpeakerId: string | null;

  /** Recent join/leave announcements */
  recentActions: ParticipantAction[];

  /** Room locked state */
  isRoomLocked: boolean;

  /** Actions */
  addParticipant: (participant: ParticipantMetadata) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<ParticipantMetadata>) => void;
  setActiveSpeaker: (participantId: string | null) => void;
  addAction: (action: ParticipantAction) => void;
  setRoomLocked: (locked: boolean) => void;
  reset: () => void;
}

const MAX_RECENT_ACTIONS = 10;

export const useParticipantsStore = create<ParticipantsStore>((set, get) => ({
  participants: new Map(),
  activeSpeakerId: null,
  recentActions: [],
  isRoomLocked: false,

  addParticipant: (participant: ParticipantMetadata) => {
    const participants = new Map(get().participants);
    participants.set(participant.id, participant);
    set({ participants });

    // Add join action
    get().addAction({
      type: "joined",
      participantId: participant.id,
      displayName: participant.displayName,
      timestamp: Date.now(),
    });
  },

  removeParticipant: (participantId: string) => {
    const participants = new Map(get().participants);
    const participant = participants.get(participantId);
    
    if (participant) {
      participants.delete(participantId);
      set({ participants });

      // Add leave action
      get().addAction({
        type: "left",
        participantId,
        displayName: participant.displayName,
        timestamp: Date.now(),
      });

      // Clear active speaker if it was this participant
      if (get().activeSpeakerId === participantId) {
        set({ activeSpeakerId: null });
      }
    }
  },

  updateParticipant: (participantId: string, updates: Partial<ParticipantMetadata>) => {
    const participants = new Map(get().participants);
    const existing = participants.get(participantId);
    
    if (existing) {
      participants.set(participantId, { ...existing, ...updates });
      set({ participants });

      // Track speaking state changes
      if (updates.isSpeaking !== undefined && updates.isSpeaking !== existing.isSpeaking) {
        get().addAction({
          type: updates.isSpeaking ? "speaking-started" : "speaking-stopped",
          participantId,
          timestamp: Date.now(),
        });

        // Update active speaker when someone starts speaking
        if (updates.isSpeaking) {
          set({ activeSpeakerId: participantId });
        }
      }
    }
  },

  setActiveSpeaker: (participantId: string | null) => {
    set({ activeSpeakerId: participantId });
  },

  addAction: (action: ParticipantAction) => {
    const recentActions = [action, ...get().recentActions].slice(0, MAX_RECENT_ACTIONS);
    set({ recentActions });
  },

  setRoomLocked: (locked: boolean) => {
    set({ isRoomLocked: locked });
  },

  reset: () => {
    set({
      participants: new Map(),
      activeSpeakerId: null,
      recentActions: [],
      isRoomLocked: false,
    });
  },
}));
