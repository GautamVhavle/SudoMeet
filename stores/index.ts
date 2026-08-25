/**
 * Zustand stores — split by domain for clear separation of concerns.
 *
 * Import stores from this barrel file:
 *   import { usePresenceStore, useParticipantsStore, useReactionsStore } from '@/stores';
 */

export { usePresenceStore } from "./presence";
export { useParticipantsStore } from "./participants";
export { useReactionsStore, sendReaction } from "./reactions";

export type { PresenceData } from "@/lib/redis/presence";
export type { ParticipantMetadata } from "./participants";
export type { Reaction, ReactionEmoji } from "./reactions";
