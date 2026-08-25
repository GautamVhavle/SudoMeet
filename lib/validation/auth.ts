import { z } from "zod";

/**
 * Zod schemas for every auth input (Phase 3 security requirement:
 * "input validation with zod on all auth inputs").
 *
 * Schemas are the single source of truth; types are inferred, never duplicated.
 */

/** Magic-link email submission. Normalizes case + whitespace at parse time. */
export const magicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
});

export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

/**
 * Guest name entry. 2–32 chars so it renders in participant tiles without
 * truncation; trimmed to prevent whitespace-only names.
 */
export const guestJoinSchema = z.object({
  name: z.string().trim().min(2).max(32),
});

export type GuestJoinInput = z.infer<typeof guestJoinSchema>;

/**
 * Transient identity for unauthenticated visitors (storage design, Phase 3).
 * Phase 4/6 persists this in an httpOnly cookie scoped to the meeting; it
 * never grants host rights and never touches the Session table.
 */
export interface GuestIdentity {
  kind: "guest";
  guestId: string;
  displayName: string;
  createdAt: string;
}

export type ParseResult<T> =
  { success: true; data: T } | { success: false; error: string };

/** Shared safeParse wrapper producing a single human-readable error. */
export function parseWith<T>(schema: z.ZodType<T>, payload: unknown): ParseResult<T> {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  return { success: true, data: result.data };
}

export function parseGuestJoinRequest(payload: unknown): ParseResult<GuestJoinInput> {
  return parseWith(guestJoinSchema, payload);
}
