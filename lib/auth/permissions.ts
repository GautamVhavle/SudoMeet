// ──────────────────────────────────────────────────────────────────────────────
// SudoMeet — authorization model (Phase 3)
//
// Pure, server-usable permission functions. No DB access, no I/O — callers
// (route handlers, server actions) fetch role + context themselves and pass
// them in. This keeps every rule unit-testable and impossible to bypass from
// the client: the UI may hide buttons, but enforcement lives here.
//
// Host identity is ALWAYS derived from meeting.hostId or an authenticated
// session — never from client-supplied fields (anti-impersonation requirement).
// ──────────────────────────────────────────────────────────────────────────────

export const MEETING_ROLES = [
  "OWNER",
  "HOST",
  "CO_HOST",
  "PARTICIPANT",
  "GUEST",
] as const;

export type MeetingRole = (typeof MEETING_ROLES)[number];

export function isMeetingRole(value: unknown): value is MeetingRole {
  return (
    typeof value === "string" && (MEETING_ROLES as readonly string[]).includes(value)
  );
}

/** Everything a permission check can need. All fields optional except role. */
export interface AuthorizationContext {
  /** Is the meeting currently locked to new entrants? */
  isLocked?: boolean;
  /** Does this meeting require host approval before joining? */
  requiresHostApproval?: boolean;
  /** Has the host started the call? */
  isStarted?: boolean;
  /** Has the meeting ended? Ended meetings reject everything. */
  isEnded?: boolean;
  /** Is recording already running? */
  isRecording?: boolean;
}

const STAFF_ROLES: readonly MeetingRole[] = ["OWNER", "HOST", "CO_HOST"];

function isStaff(role: MeetingRole): boolean {
  return STAFF_ROLES.includes(role);
}

function baseAllowed(ctx: AuthorizationContext | undefined): boolean {
  // An ended meeting rejects every action, including staff ones.
  return !(ctx?.isEnded ?? false);
}

/**
 * Join a meeting.
 * - Everyone may join while unlocked; GUESTs additionally need explicit
 *   approval when the meeting requiresHostApproval.
 * - Staff bypass both gates (they must be able to enter their own room).
 */
export function canJoinMeeting(role: MeetingRole, ctx?: AuthorizationContext): boolean {
  if (!baseAllowed(ctx)) return false;
  if (isStaff(role)) return true;
  if (ctx?.isLocked) return false;
  if (role === "GUEST" && (ctx?.requiresHostApproval ?? false)) return false;
  return true;
}

/** Start the call. Owner/host only, and only before it has begun. */
export function canStartMeeting(role: MeetingRole, ctx?: AuthorizationContext): boolean {
  if (!baseAllowed(ctx)) return false;
  if (ctx?.isStarted) return false;
  return role === "OWNER" || role === "HOST";
}

/** Lock/unlock the room against new joins. Owner/host only. */
export function canLockMeeting(role: MeetingRole, ctx?: AuthorizationContext): boolean {
  if (!baseAllowed(ctx)) return false;
  return role === "OWNER" || role === "HOST";
}

/** Admit participants waiting in the lobby. Owner/host/co-host. */
export function canApproveParticipant(
  role: MeetingRole,
  ctx?: AuthorizationContext,
): boolean {
  if (!baseAllowed(ctx)) return false;
  return isStaff(role);
}

/** Remove a participant from the call. Owner/host/co-host. */
export function canRemoveParticipant(
  role: MeetingRole,
  ctx?: AuthorizationContext,
): boolean {
  if (!baseAllowed(ctx)) return false;
  return isStaff(role);
}

/** Mute other participants. Owner/host/co-host. */
export function canMuteParticipant(
  role: MeetingRole,
  ctx?: AuthorizationContext,
): boolean {
  if (!baseAllowed(ctx)) return false;
  return isStaff(role);
}

/** Begin cloud recording. Owner/host only (legal/consent weight). */
export function canStartRecording(
  role: MeetingRole,
  ctx?: AuthorizationContext,
): boolean {
  if (!baseAllowed(ctx)) return false;
  if (ctx?.isRecording) return false;
  return role === "OWNER" || role === "HOST";
}

/** Create breakout rooms. Owner/host only. */
export function canCreateBreakoutRooms(
  role: MeetingRole,
  ctx?: AuthorizationContext,
): boolean {
  if (!baseAllowed(ctx)) return false;
  return role === "OWNER" || role === "HOST";
}
