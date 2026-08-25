/**
 * Reactions store — ephemeral emoji reactions during calls.
 *
 * Reactions are broadcast via signaling/Redis and displayed briefly.
 * No database persistence.
 *
 * Supported reactions: 👍 ❤️ 😂 🎉 👏
 */

import { create } from "zustand";

export type ReactionEmoji = "👍" | "❤️" | "😂" | "🎉" | "👏";

export interface Reaction {
  id: string;
  participantId: string;
  participantName: string;
  emoji: ReactionEmoji;
  timestamp: number;
}

interface ReactionsStore {
  /** Active reactions (cleared after animation) */
  reactions: Reaction[];

  /** Actions */
  addReaction: (reaction: Reaction) => void;
  removeReaction: (id: string) => void;
  clearOldReactions: (beforeTimestamp: number) => void;
  reset: () => void;
}

export const useReactionsStore = create<ReactionsStore>((set, get) => ({
  reactions: [],

  addReaction: (reaction: Reaction) => {
    set({ reactions: [...get().reactions, reaction] });

    // Auto-remove after 3 seconds
    setTimeout(() => {
      get().removeReaction(reaction.id);
    }, 3000);
  },

  removeReaction: (id: string) => {
    set({ reactions: get().reactions.filter((r) => r.id !== id) });
  },

  clearOldReactions: (beforeTimestamp: number) => {
    set({
      reactions: get().reactions.filter((r) => r.timestamp >= beforeTimestamp),
    });
  },

  reset: () => {
    set({ reactions: [] });
  },
}));

/** Helper to send reaction via signaling */
export async function sendReaction(
  meetingId: string,
  participantId: string,
  participantName: string,
  emoji: ReactionEmoji,
): Promise<void> {
  try {
    await fetch(`/api/signal/${meetingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reaction",
        participantId,
        participantName,
        emoji,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error("[reactions] Failed to send reaction:", error);
  }
}
