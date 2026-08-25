import { getSessionUserId } from "@/lib/auth";
import { parseCreateMeetingRequest } from "@/lib/validation/meetings";
import {
  createMeeting,
  listMeetingsForUser,
  MeetingServiceError,
} from "@/features/meetings/service";

export { dynamic } from "@/app/dynamic-exports";

/**
 * POST /api/meetings — create a meeting (authenticated users only; guests
 * cannot create meetings). Returns 201 with roomCode + joinUrl.
 */
export async function POST(request: Request): Promise<Response> {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseCreateMeetingRequest(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 422 });
  }

  try {
    const meeting = await createMeeting(userId, parsed.data);
    return Response.json(
      {
        id: meeting.id,
        title: meeting.title,
        roomCode: meeting.roomCode,
        joinUrl: `/m/${meeting.roomCode}`,
        status: meeting.status,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MeetingServiceError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("POST /api/meetings failed:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * GET /api/meetings?status=A,B — list the caller's meetings, newest first.
 */
export async function GET(request: Request): Promise<Response> {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status") ?? undefined;

  let statuses: string[] | undefined;
  if (rawStatus !== undefined) {
    const { meetingStatusFilterSchema } = await import("@/lib/validation/meetings");
    const parsedStatuses = meetingStatusFilterSchema.safeParse(rawStatus);
    if (!parsedStatuses.success) {
      return Response.json(
        { error: "Invalid status filter." },
        { status: 422 },
      );
    }
    statuses = parsedStatuses.data;
  }

  try {
    const meetings = await listMeetingsForUser(userId, statuses);
    return Response.json({
      meetings: meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        roomCode: meeting.roomCode,
        joinUrl: `/m/${meeting.roomCode}`,
        status: meeting.status,
        isLocked: meeting.isLocked,
        createdAt: meeting.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/meetings failed:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
