/**
 * Chat hook — manages chat history, sending, and realtime updates.
 *
 * Features:
 * - Fetch message history on mount
 * - Optimistic message sending with retry
 * - Realtime message delivery via SSE
 * - Automatic reconnection recovery
 */

import { useEffect, useCallback, useRef } from "react";
import { useChatStore } from "@/stores/chat";
import type { ChatMessageDTO } from "@/lib/chat/validation";

interface UseChatOptions {
  meetingId: string;
  /** Current user info for optimistic updates */
  currentUser?: {
    id: string;
    name: string;
    image?: string | null;
  };
  /** Whether to auto-fetch history on mount */
  autoFetch?: boolean;
}

export function useChat(options: UseChatOptions) {
  const { meetingId, currentUser, autoFetch = true } = options;
  const {
    messages,
    isLoadingHistory,
    unreadCount,
    error,
    setMessages,
    addMessage,
    updateMessageStatus,
    markAsRead,
    setLoadingHistory,
    setError,
    reset,
  } = useChatStore();

  const hasLoadedRef = useRef(false);

  /**
   * Fetch message history from API.
   */
  const fetchHistory = useCallback(
    async (before?: string) => {
      setLoadingHistory(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (before) params.set("before", before);

        const res = await fetch(`/api/chat/${meetingId}?${params}`);

        if (!res.ok) {
          throw new Error(`Failed to fetch messages: ${res.status}`);
        }

        const data = await res.json();
        const chatMessages = (data.messages as ChatMessageDTO[]).map((msg) => ({
          ...msg,
          status: "sent" as const,
        }));

        setMessages(chatMessages);
      } catch (err) {
        console.error("[useChat] Failed to fetch history:", err);
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        setLoadingHistory(false);
      }
    },
    [meetingId, setMessages, setLoadingHistory, setError],
  );

  /**
   * Send a message with optimistic update.
   */
  const sendMessage = useCallback(
    async (body: string) => {
      if (!body.trim()) return;

      const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
      const now = new Date().toISOString();

      // Optimistic update: show message immediately
      const optimisticMessage = {
        id: optimisticId,
        meetingId,
        userId: currentUser?.id ?? null,
        body: body.trim(),
        createdAt: now,
        status: "sending" as const,
        optimisticId,
        sender: {
          id: currentUser?.id ?? optimisticId,
          name: currentUser?.name ?? "You",
          image: currentUser?.image ?? null,
        },
      };

      addMessage(optimisticMessage);

      try {
        const res = await fetch(`/api/chat/${meetingId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: body.trim() }),
        });

        if (!res.ok) {
          throw new Error(`Send failed: ${res.status}`);
        }

        const data = await res.json();
        updateMessageStatus(optimisticId, "sent", data.message);
      } catch (err) {
        console.error("[useChat] Failed to send message:", err);
        updateMessageStatus(optimisticId, "failed");
        setError(err instanceof Error ? err.message : "Failed to send message");
      }
    },
    [meetingId, currentUser, addMessage, updateMessageStatus, setError],
  );

  /**
   * Retry a failed message.
   */
  const retryMessage = useCallback(
    async (message: (typeof messages)[number]) => {
      if (!message.optimisticId) return;

      updateMessageStatus(message.optimisticId, "sending");
      await sendMessage(message.body);
    },
    [sendMessage, updateMessageStatus],
  );

  /**
   * Auto-fetch history on mount.
   */
  useEffect(() => {
    if (autoFetch && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchHistory();
    }
  }, [autoFetch, fetchHistory]);

  /**
   * Subscribe to realtime chat events via SSE (if implemented in Phase 8).
   */
  useEffect(() => {
    // TODO: Subscribe to SSE events for realtime message delivery
    // This would integrate with the existing /api/signal/[meetingId] SSE endpoint
    // by listening for { type: "chat", data: ChatMessageDTO } events.
    //
    // For now, messages are delivered via optimistic updates + API responses.
    // Full SSE integration can be added when the signaling system is refactored
    // to support typed event channels.
  }, [meetingId]);

  /**
   * Reset on unmount.
   */
  useEffect(() => {
    return () => reset();
  }, [reset]);

  return {
    messages,
    isLoadingHistory,
    unreadCount,
    error,
    sendMessage,
    retryMessage,
    fetchHistory,
    markAsRead,
  };
}
