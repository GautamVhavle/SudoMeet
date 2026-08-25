import { getOrCreateIdentity } from "@/lib/identity";
import { ensureAnonymousUser } from "@/lib/identity/ensure-user";
import { roomCodeSchema } from "@/lib/validation/meetings";
import { joinByRoomCode, MeetingServiceError } from "@/features/meetings/service";

export { dynamic } from "@/app/dynamic-exports";

/**
 * POST /api/meetings/join — join a meeting by room code.
 *
 * Body: { roomCode: string, displayName?: string }
 * - Authenticated users join under their session user id (Participant row is
 *   reused on rejoin via the [meetingId, userId] unique).
 * - Guests may pass displayName; guest cookie persistence arrives Phase 6.
 *
 * Responses:
 *   200 { action: "joined" | "waiting", meeting, participant }
 *   401 invalid room code format
 *   403 locked room (non-host)
 *   404 unknown room code
 *   409 approval required / capacity full
 *   410 ended or expired
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as { roomCode?: unknown; displayName?: unknown };
  const parsedCode = roomCodeSchema.safeParse(payload.roomCode);

  if (!parsedCode.success) {
    return Response.json({ error: "Invalid room code." }, { status: 401 });
  }

  const displayName =
    typeof payload.displayName === "string" && payload.displayName.trim().length > 0
      ? payload.displayName.trim().slice(0, 60)
      : "Guest";

  const identity = await getOrCreateIdentity();
  await ensureAnonymousUser(identity);
  const userId = identity.id;

  try {
    const outcome = await joinByRoomCode({
      roomCode: parsedCode.data,
      userId,
      displayName,
    });

    const status =
      outcome.action === "waiting" || outcome.action === "approval-required" ? 200 : 200;

    return Response.json(
      {
        action: outcome.action,
        meeting: {
          id: outcome.meeting.id,
          title: outcome.meeting.title,
          roomCode: outcome.meeting.roomCode,
          status: outcome.meeting.status,
          isLocked: outcome.meeting.isLocked,
        },
        participant: outcome.participant
          ? {
              id: outcome.participant.id,
              role: outcome.participant.role,
              joinedAt: outcome.participant.joinedAt.toISOString(),
            }
          : undefined,
      },
      { status },
    );
  } catch (error) {
    if (error instanceof MeetingServiceError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "LOCKED"
            ? 403
            : error.code === "ENDED" || error.code === "EXPIRED"
              ? 410
              : 409; // WAITING_APPROVAL, FULL, CONFLICT
      return Response.json({ error: error.message, code: error.code }, { status });
    }
    console.error("POST /api/meetings/join failed:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
