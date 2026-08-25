import { Prisma, type Meeting, type Participant } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  canJoinMeeting,
  canLockMeeting,
  type MeetingRole,
} from "@/lib/auth/permissions";
import { computeExpiry } from "./lifecycle";
import {
  buildJoinUrl,
  generateRoomCode,
  personalRoomSlug,
} from "./room-codes";

/**
 * Meeting service (Phase 4) — the ONLY module that touches the database for
 * meeting lifecycle. Route handlers and server components call these
 * functions; authorization is enforced here server-side by comparing
 * session user id against meeting.hostId. Client input can never grant host
 * powers.
 */

/** Error type thrown by the service; route handlers map it to HTTP codes. */
export class MeetingServiceError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "GONE"
      | "FORBIDDEN"
      | "CONFLICT"
      | "FULL"
      | "LOCKED"
      | "WAITING_APPROVAL"
      | "ENDED"
      | "EXPIRED",
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MeetingServiceError";
  }
}

const P2002 = "P2002";

export interface CreateMeetingOptions {
  title: string;
  scheduled?: boolean;
  maxParticipants?: number;
  requiresHostApproval?: boolean;
}

export async function createMeeting(
  userId: string,
  options: CreateMeetingOptions,
): Promise<Meeting> {
  const status = options.scheduled ? ("SCHEDULED" as const) : ("DRAFT" as const);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.meeting.create({
        data: {
          roomCode: generateRoomCode(),
          slug: `${personalRoomSlug(userId)}-${Date.now().toString(36)}`,
          title: options.title,
          hostId: userId,
          mediaProvider: "P2P",
          status,
          maxParticipants: options.maxParticipants ?? 4,
          requiresHostApproval: options.requiresHostApproval ?? false,
        },
      });
    } catch (error) {
      // Unique violation on roomCode/slug — regenerate and retry.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === P2002 &&
        attempt < 4
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new MeetingServiceError("CONFLICT", "Could not allocate a unique room code.");
}

/**
 * The stable Personal Room for a user — created on first access, reused after.
 */
export async function getOrCreatePersonalRoom(userId: string): Promise<Meeting> {
  const existing = await prisma.meeting.findFirst({
    where: { hostId: userId, slug: personalRoomSlug(userId) },
  });
  if (existing) return existing;

  const baseTitle = "Personal Room";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.meeting.create({
        data: {
          roomCode: generateRoomCode(),
          slug: personalRoomSlug(userId),
          title: baseTitle,
          hostId: userId,
          mediaProvider: "P2P",
          status: "DRAFT",
          maxParticipants: 4,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === P2002) {
        // Someone else won the roomCode race; our slug may already exist now.
        const raced = await prisma.meeting.findFirst({
          where: { hostId: userId, slug: personalRoomSlug(userId) },
        });
        if (raced) return raced;
        continue;
      }
      throw error;
    }
  }

  throw new MeetingServiceError("CONFLICT", "Could not allocate a personal room.");
}

export async function listMeetingsForUser(
  userId: string,
  statuses?: string[],
): Promise<Meeting[]> {
  return prisma.meeting.findMany({
    where: {
      hostId: userId,
      ...(statuses && statuses.length > 0 ? { status: { in: statuses as never[] } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getMeetingById(
  id: string,
  userId: string,
): Promise<Meeting | null> {
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting || meeting.hostId !== userId) return null;
  return meeting;
}

export async function updateMeeting(
  id: string,
  userId: string,
  patch: { title?: string; isLocked?: boolean },
): Promise<Meeting> {
  const meeting = await prisma.meeting.findUnique({ where: { id } });

  if (!meeting || meeting.hostId !== userId) {
    throw new MeetingServiceError("NOT_FOUND", "Meeting not found.");
  }

  if (patch.isLocked !== undefined && !canLockMeeting("HOST")) {
    // Defensive: unreachable today (host always passes), but keeps the rule
    // centralized so future role changes stay safe.
    throw new MeetingServiceError("FORBIDDEN", "Not allowed to lock this room.");
  }

  return prisma.meeting.update({ where: { id }, data: patch });
}

export async function deleteMeeting(id: string, userId: string): Promise<void> {
  const meeting = await prisma.meeting.findUnique({ where: { id } });

  if (!meeting || meeting.hostId !== userId) {
    throw new MeetingServiceError("NOT_FOUND", "Meeting not found.");
  }

  await prisma.meeting.delete({ where: { id } });
}

// ── Join flow ────────────────────────────────────────────────────────────────

export interface JoinOutcome {
  action: "joined" | "waiting" | "approval-required" | "ended" | "expired";
  meeting: Meeting;
  participant?: Participant;
}

export async function joinByRoomCode(input: {
  roomCode: string;
  userId: string | null;
  displayName: string;
}): Promise<JoinOutcome> {
  const meeting = await prisma.meeting.findUnique({
    where: { roomCode: input.roomCode.toLowerCase() },
    include: { _count: { select: { participants: true } } },
  });

  if (!meeting) {
    throw new MeetingServiceError("NOT_FOUND", "No meeting with that room code.");
  }

  const expiry = computeExpiry(meeting.status, meeting.expiresAt);
  if (expiry.expired) {
    await prisma.meeting.update({ where: { id: meeting.id }, data: { status: "EXPIRED" } });
    throw new MeetingServiceError("EXPIRED", "This meeting has expired.");
  }
  if (meeting.status === "ENDED") {
    throw new MeetingServiceError("ENDED", "This meeting has ended.");
  }

  const role: MeetingRole = input.userId && meeting.hostId === input.userId ? "HOST" : "GUEST";

  const activeCount = await prisma.participant.count({
    where: { meetingId: meeting.id, leftAt: null },
  });

  const capacity = Math.min(meeting.maxParticipants, 8);
  const isHost = role === "HOST";
  const atCapacity = !isHost && activeCount >= capacity;

  const decision = canJoinMeeting(role, {
    isLocked: meeting.isLocked,
    requiresHostApproval: meeting.requiresHostApproval,
    isEnded: false,
  });

  if (!decision) {
    if (meeting.isLocked && !isHost) {
      throw new MeetingServiceError("LOCKED", "This room is locked by the host.");
    }
    throw new MeetingServiceError(
      "WAITING_APPROVAL",
      "The host must approve you before you can join.",
    );
  }

  if (atCapacity) {
    throw new MeetingServiceError(
      "FULL",
      `This meeting is full (${capacity} of ${capacity} participants).`,
    );
  }

  // Rejoin reuses the Participant row (unique [meetingId, userId] when authed).
  const participant = await upsertParticipant({
    meetingId: meeting.id,
    userId: input.userId,
    displayName: input.displayName,
    role: isHost ? "host" : "guest",
  });

  let nextStatus: Meeting["status"] | undefined;

  if (isHost) {
    // Host entering starts the call (DRAFT/SCHEDULED/WAITING → ACTIVE).
    // ENDED/EXPIRED were already ruled out above (throws on both).
    if (meeting.status !== "ACTIVE") {
      nextStatus = "ACTIVE";
    }
  } else if (meeting.status === "DRAFT" || meeting.status === "SCHEDULED") {
    nextStatus = "WAITING";
  }

  const updated = nextStatus
    ? await prisma.meeting.update({ where: { id: meeting.id }, data: { status: nextStatus } })
    : meeting;

  if (!isHost && nextStatus === "WAITING") {
    return { action: "waiting", meeting: updated, participant };
  }

  return { action: "joined", meeting: updated, participant };
}

async function upsertParticipant(input: {
  meetingId: string;
  userId: string | null;
  displayName: string;
  role: string;
}): Promise<Participant> {
  if (input.userId) {
    return prisma.participant.upsert({
      where: { meetingId_userId: { meetingId: input.meetingId, userId: input.userId } },
      create: {
        meetingId: input.meetingId,
        userId: input.userId,
        displayName: input.displayName,
        role: input.role,
      },
      update: { leftAt: null, joinedAt: new Date(), role: input.role },
    });
  }

  // Guests have no stable identity yet (cookie persistence arrives Phase 6);
  // each join creates a fresh row.
  return prisma.participant.create({
    data: {
      meetingId: input.meetingId,
      displayName: input.displayName,
      role: input.role,
    },
  });
}

export async function leaveMeeting(meetingId: string, participantId: string): Promise<void> {
  await prisma.participant.updateMany({
    where: { id: participantId, meetingId, leftAt: null },
    data: { leftAt: new Date() },
  });
}

export async function recentParticipants(meetingId: string): Promise<Participant[]> {
  return prisma.participant.findMany({
    where: { meetingId },
    orderBy: { joinedAt: "desc" },
    take: 20,
  });
}

export async function findMeetingByRoomCode(roomCode: string): Promise<Meeting | null> {
  return prisma.meeting.findUnique({ where: { roomCode: roomCode.toLowerCase() } });
}

export async function sweepExpiredMeetings(now: Date = new Date()): Promise<number> {
  const result = await prisma.meeting.updateMany({
    where: {
      expiresAt: { lte: now },
      status: { notIn: ["ENDED", "EXPIRED"] },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

export function joinUrlFor(appUrl: string, meeting: Meeting): string {
  return buildJoinUrl(appUrl, meeting.roomCode);
}
