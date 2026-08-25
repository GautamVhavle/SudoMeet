import { getSessionUserId } from "@/lib/auth";
import { parseUpdateMeetingRequest } from "@/lib/validation/meetings";
import {
  deleteMeeting,
  getMeetingById,
  MeetingServiceError,
  updateMeeting,
} from "@/features/meetings/service";

export { dynamic } from "@/app/dynamic-exports";

function errorResponse(error: unknown): Response {
  if (error instanceof MeetingServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "GONE"
          ? 410
          : error.code === "FORBIDDEN"
            ? 403
            : 409;
    return Response.json({ error: error.message }, { status });
  }
  console.error("meeting :id route failed:", error);
  return Response.json({ error: "Internal server error." }, { status: 500 });
}

/**
 * GET /api/meetings/:id — fetch one of the caller's meetings (host-scoped).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const meeting = await getMeetingById(id, userId);
    if (!meeting) {
      return Response.json({ error: "Meeting not found." }, { status: 404 });
    }
    return Response.json({
      id: meeting.id,
      title: meeting.title,
      roomCode: meeting.roomCode,
      joinUrl: `/m/${meeting.roomCode}`,
      status: meeting.status,
      isLocked: meeting.isLocked,
      maxParticipants: meeting.maxParticipants,
      createdAt: meeting.createdAt.toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PATCH /api/meetings/:id — edit title and/or lock/unlock the room.
 * Host-only, enforced server-side via hostId === session user id.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseUpdateMeetingRequest(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 422 });
  }

  try {
    const meeting = await updateMeeting(id, userId, parsed.data);
    return Response.json({
      id: meeting.id,
      title: meeting.title,
      roomCode: meeting.roomCode,
      joinUrl: `/m/${meeting.roomCode}`,
      status: meeting.status,
      isLocked: meeting.isLocked,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/meetings/:id — remove the meeting; cascades clean up
 * participants/messages. Subsequent lookups report 404 (deleted room).
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await deleteMeeting(id, userId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
