/**
 * Zustand stores — split by domain for clear separation of concerns.
 *
 * Import stores from this barrel file:
 *   import { usePresenceStore, useParticipantsStore, useReactionsStore, useChatStore, useLayoutStore } from '@/stores';
 */

export { usePresenceStore } from "./presence";
export { useParticipantsStore } from "./participants";
export { useReactionsStore, sendReaction } from "./reactions";
export { useChatStore } from "./chat";
export { useLayoutStore, getSpotlightParticipant } from "./layout";

export type { PresenceData } from "@/lib/redis/presence";
export type { ParticipantMetadata } from "./participants";
export type { Reaction, ReactionEmoji } from "./reactions";
export type { ChatMessage } from "./chat";
export type { LayoutMode } from "./layout";
