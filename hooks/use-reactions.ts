/**
 * Reactions hook — send and display ephemeral emoji reactions.
 *
 * Automatically cleans up old reactions after 3 seconds.
 */

"use client";

import { useEffect } from "react";

import {
  sendReaction,
  useReactionsStore,
  type Reaction,
  type ReactionEmoji,
} from "@/stores/reactions";

export function useReactions(meetingId: string | null) {
  const { reactions, addReaction, clearOldReactions, reset } = useReactionsStore();

  // Auto-cleanup old reactions every second
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 3000;
      clearOldReactions(cutoff);
    }, 1000);

    return () => clearInterval(interval);
  }, [clearOldReactions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return {
    /** Active reactions */
    reactions,

    /** Send a reaction */
    send: async (
      participantId: string,
      participantName: string,
      emoji: ReactionEmoji,
    ) => {
      if (!meetingId) {
        console.warn("[useReactions] No meeting ID, cannot send reaction");
        return;
      }

      const reaction: Reaction = {
        id: `${participantId}-${Date.now()}-${Math.random()}`,
        participantId,
        participantName,
        emoji,
        timestamp: Date.now(),
      };

      // Optimistically add locally
      addReaction(reaction);

      // Broadcast to others
      await sendReaction(meetingId, participantId, participantName, emoji);
    },

    /** Receive a reaction (from signaling) */
    receive: (reaction: Reaction) => {
      addReaction(reaction);
    },

    /** Get reactions for a specific participant */
    getForParticipant: (participantId: string) => {
      return reactions.filter((r) => r.participantId === participantId);
    },

    /** Clear all reactions */
    clear: reset,
  };
}
