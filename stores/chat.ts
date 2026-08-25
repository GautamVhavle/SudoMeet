/**
 * Chat store (Zustand) — meeting-scoped chat state with optimistic updates.
 *
 * Features:
 * - Optimistic sending: messages appear immediately, reconciled on server response
 * - Message history from database
 * - Realtime updates via SSE events
 * - Failed message retry
 * - Unread state tracking
 */

import { create } from "zustand";
import type { ChatMessageDTO } from "@/lib/chat/validation";

export interface ChatMessage extends ChatMessageDTO {
  /** Optimistic send status */
  status: "sending" | "sent" | "failed";
  /** Temporary ID for optimistic updates (before server assigns real ID) */
  optimisticId?: string;
}

interface ChatState {
  /** Messages for the current meeting (newest first for display) */
  messages: ChatMessage[];
  /** Whether initial history is loading */
  isLoadingHistory: boolean;
  /** Number of unread messages (reset when chat panel is opened) */
  unreadCount: number;
  /** Last error that occurred */
  error: string | null;

  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessageStatus: (
    optimisticId: string,
    status: ChatMessage["status"],
    serverMessage?: ChatMessageDTO,
  ) => void;
  markAsRead: () => void;
  setLoadingHistory: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  messages: [],
  isLoadingHistory: false,
  unreadCount: 0,
  error: null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => {
      // Check if message already exists (avoid duplicates from SSE)
      const exists = state.messages.some(
        (m) => m.id === message.id || m.optimisticId === message.optimisticId,
      );
      if (exists) return state;

      return {
        messages: [message, ...state.messages],
        unreadCount: state.unreadCount + 1,
      };
    }),

  updateMessageStatus: (optimisticId, status, serverMessage) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.optimisticId === optimisticId
          ? {
              ...msg,
              ...serverMessage,
              status,
              optimisticId: undefined, // Clear after reconciliation
            }
          : msg,
      ),
    })),

  markAsRead: () => set({ unreadCount: 0 }),

  setLoadingHistory: (loading) => set({ isLoadingHistory: loading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
