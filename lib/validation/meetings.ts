import { z } from "zod";

/**
 * Zod schemas for every meeting API/action input (Phase 4 security posture:
 * identical to auth — validate at the trust boundary, infer types, never
 * duplicate).
 *
 * Authorization is NEVER part of these schemas: host identity comes from the
 * server session compared against meeting.hostId, never from client input.
 */

/** Tier A targets ~4 participants (P2P); 8 is the hard ceiling this phase. */
export const MEETING_MAX_PARTICIPANTS_CEILING = 8;

export const TITLE_MAX_LENGTH = 120;

/**
 * Create meeting. `scheduled` flips the lifecycle DRAFT → SCHEDULED (the
 * schema has no scheduledFor column; "upcoming" means status SCHEDULED).
 */
export const createMeetingSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(TITLE_MAX_LENGTH),
  scheduled: z.boolean().optional(),
  maxParticipants: z
    .number()
    .int()
    .min(2)
    .max(MEETING_MAX_PARTICIPANTS_CEILING)
    .optional(),
  requiresHostApproval: z.boolean().optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

/** PATCH /api/meetings/:id — edit title and/or lock/unlock the room. */
export const updateMeetingSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(TITLE_MAX_LENGTH),
    isLocked: z.boolean(),
  })
  .partial()
  .refine(
    (patch) => patch.title !== undefined || patch.isLocked !== undefined,
    "Provide at least one of: title, isLocked.",
  );

export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

const MEETING_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "WAITING",
  "ACTIVE",
  "ENDED",
  "EXPIRED",
] as const;

/** Optional `?status=A,B` filter for GET /api/meetings. */
export const meetingStatusFilterSchema = z
  .string()
  .optional()
  .transform((value) => (value ? value.split(",").map((s) => s.trim()) : []))
  .transform((parts) => {
    const invalid = parts.filter(
      (part) => !(MEETING_STATUSES as readonly string[]).includes(part),
    );
    return { parts, invalid };
  })
  .refine(({ invalid }) => invalid.length === 0, {
    message: `status must be a comma-separated list of: ${MEETING_STATUSES.join(", ")}`,
  })
  .transform(({ parts }) => parts.filter((part) => part !== ""));

export type MeetingStatusFilter = z.infer<typeof meetingStatusFilterSchema>;

/** Room codes are lowercase letters + dashes only (see features/meetings/room-codes). */
export const roomCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]+(-[a-z]+)*$/, "Invalid room code.");

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

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

export function parseCreateMeetingRequest(payload: unknown): ParseResult<CreateMeetingInput> {
  return parseWith(createMeetingSchema, payload);
}

export function parseUpdateMeetingRequest(payload: unknown): ParseResult<UpdateMeetingInput> {
  return parseWith(updateMeetingSchema, payload);
}
