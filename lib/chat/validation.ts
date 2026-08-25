/**
 * Zod validation schemas for chat messages.
 */

import { z } from "zod";

/**
 * Chat message send request schema.
 */
export const SendMessageSchema = z.object({
  body: z
    .string()
    .min(1, "Message cannot be empty")
    .max(10000, "Message too long (max 10,000 characters)")
    .transform((s) => s.trim()),
});

export type SendMessageInput = z.input<typeof SendMessageSchema>;
export type SendMessageData = z.output<typeof SendMessageSchema>;

/**
 * Chat message fetch request schema (pagination).
 */
export const FetchMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().cuid().optional(), // Cursor: fetch messages before this ID
});

export type FetchMessagesInput = z.input<typeof FetchMessagesSchema>;
export type FetchMessagesData = z.output<typeof FetchMessagesSchema>;

/**
 * Serializable chat message (API response).
 */
export const ChatMessageSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  userId: z.string().nullable(),
  body: z.string(),
  createdAt: z.string(), // ISO timestamp
  sender: z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().nullable().optional(),
  }),
});

export type ChatMessageDTO = z.infer<typeof ChatMessageSchema>;
