import type { MeetingStatus } from "@prisma/client";

/**
 * Meeting lifecycle (Phase 4) — a pure, exhaustive state machine over the
 * Prisma MeetingStatus enum:
 *
 *   DRAFT ──schedule──▶ SCHEDULED
 *   DRAFT|SCHEDULED|WAITING ──start──▶ ACTIVE
 *   ACTIVE|WAITING ──end──▶ ENDED
 *   SCHEDULED|ACTIVE|WAITING|DRAFT ──expire──▶ EXPIRED   (sweeper, time-based)
 *
 * All transitions are validated here so route handlers and the sweeper can
 * never drive a meeting into an illegal state. Unit-tested in
 * tests/unit/meeting-lifecycle.test.ts.
 */

export type LifecycleEvent =
  | "create"
  | "schedule"
  | "start"
  | "wait"
  | "join"
  | "end"
  | "expire";

export type LifecycleResult =
  | { ok: true; next: MeetingStatus }
  | { ok: false; reason: string };

const TRANSITIONS: Record<MeetingStatus, Partial<Record<LifecycleEvent, MeetingStatus>>> = {
  DRAFT: { schedule: "SCHEDULED", start: "ACTIVE", wait: "WAITING", expire: "EXPIRED" },
  SCHEDULED: { start: "ACTIVE", wait: "WAITING", expire: "EXPIRED" },
  WAITING: { start: "ACTIVE", join: "ACTIVE", end: "ENDED", expire: "EXPIRED" },
  ACTIVE: { end: "ENDED", expire: "EXPIRED" },
  ENDED: {},
  EXPIRED: {},
};

/** Pure transition check — no I/O. */
export function transition(status: MeetingStatus, event: LifecycleEvent): LifecycleResult {
  const next = TRANSITIONS[status][event];

  if (!next) {
    return { ok: false, reason: `Cannot ${event} a meeting in status ${status}.` };
  }
  return { ok: true, next };
}

/** A meeting is live when participants are (or may be) connected. */
export function isActive(status: MeetingStatus): boolean {
  return status === "ACTIVE";
}

/** Terminal states — no further lifecycle events apply. */
export function isTerminal(status: MeetingStatus): boolean {
  return status === "ENDED" || status === "EXPIRED";
}

/**
 * Expiry sweep rule: any non-terminal meeting whose expiresAt has passed is
 * EXPIRED. Meetings without expiresAt never auto-expire.
 */
export function computeExpiry(
  status: MeetingStatus,
  expiresAt: Date | null,
  now: Date = new Date(),
): { expired: boolean; next?: MeetingStatus } {
  if (expiresAt === null || isTerminal(status)) return { expired: false };
  if (expiresAt.getTime() <= now.getTime()) {
    return transition(status, "expire").ok
      ? { expired: true, next: "EXPIRED" }
      : { expired: false };
  }
  return { expired: false };
}
