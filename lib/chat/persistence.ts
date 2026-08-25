/**
 * Chat message persistence layer.
 *
 * Architecture:
 * - Database (Postgres) is the source of truth
 * - Redis is used for realtime pub/sub delivery only (not storage)
 * - Messages survive reconnects and refreshes via DB history fetch
 */

import { prisma } from "@/lib/db";
import type { ChatMessageDTO } from "./validation";

export interface SendMessageParams {
  meetingId: string;
  userId: string | null;
  body: string;
  senderName: string;
  senderImage?: string | null;
}

export interface FetchMessagesParams {
  meetingId: string;
  limit?: number;
  before?: string; // Message ID cursor for pagination
}

/**
 * Store a chat message in the database.
 *
 * @returns Serializable message DTO ready for API response
 */
export async function storeMessage(params: SendMessageParams): Promise<ChatMessageDTO> {
  const { meetingId, userId, body, senderName, senderImage } = params;

  const message = await prisma.chatMessage.create({
    data: {
      meetingId,
      userId,
      body,
    },
    select: {
      id: true,
      meetingId: true,
      userId: true,
      body: true,
      createdAt: true,
    },
  });

  return {
    id: message.id,
    meetingId: message.meetingId,
    userId: message.userId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    sender: {
      id: userId ?? message.id, // Use message ID as fallback for guest senders
      name: senderName,
      image: senderImage ?? null,
    },
  };
}

/**
 * Fetch message history for a meeting (paginated).
 *
 * Returns messages in reverse chronological order (newest first).
 */
export async function fetchMessages(
  params: FetchMessagesParams,
): Promise<ChatMessageDTO[]> {
  const { meetingId, limit = 50, before } = params;

  const messages = await prisma.chatMessage.findMany({
    where: {
      meetingId,
      deletedAt: null,
      ...(before && {
        id: { lt: before }, // Cursor-based pagination
      }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      meetingId: true,
      userId: true,
      body: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return messages.map((msg: {
    id: string;
    meetingId: string;
    userId: string | null;
    body: string;
    createdAt: Date;
    user: { id: string; name: string | null; image: string | null } | null;
  }) => ({
    id: msg.id,
    meetingId: msg.meetingId,
    userId: msg.userId,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
    sender: {
      id: msg.user?.id ?? msg.id,
      name: msg.user?.name ?? "Guest",
      image: msg.user?.image ?? null,
    },
  }));
}

/**
 * Get the total message count for a meeting (for UI badges).
 */
export async function getMessageCount(meetingId: string): Promise<number> {
  return prisma.chatMessage.count({
    where: { meetingId, deletedAt: null },
  });
}

/**
 * Soft-delete a message (for moderation/cleanup).
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });
}
