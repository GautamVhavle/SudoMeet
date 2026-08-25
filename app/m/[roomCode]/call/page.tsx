import { notFound } from "next/navigation";

import { getOrCreateIdentity } from "@/lib/identity";
import { ensureAnonymousUser } from "@/lib/identity/ensure-user";
import { prisma } from "@/lib/db";
import { roomCodeSchema } from "@/lib/validation/meetings";
import { findMeetingByRoomCode } from "@/features/meetings/service";
import { computeExpiry } from "@/features/meetings/lifecycle";
import { CallShell } from "./call-shell";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /m/[roomCode]/call — the live call.
 *
 * Identity is resolved here because `sudomeet_id` is HttpOnly and therefore
 * unreadable from the browser; the client needs a stable peer id to signal with.
 */

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function CallPage({ params }: PageProps) {
  const { roomCode } = await params;
  const parsed = roomCodeSchema.safeParse(roomCode);
  if (!parsed.success) notFound();

  const meeting = await findMeetingByRoomCode(parsed.data);
  if (!meeting) notFound();

  const expiry = computeExpiry(meeting.status, meeting.expiresAt);
  if (expiry.expired || meeting.status === "EXPIRED" || meeting.status === "ENDED") {
    notFound();
  }

  const identity = await getOrCreateIdentity();
  await ensureAnonymousUser(identity);

  // Rooms are created as DRAFT; entering the call is what makes them live.
  if (meeting.status !== "ACTIVE") {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: "ACTIVE",
        startedAt: meeting.startedAt ?? new Date(),
      },
    });
  }

  return (
    <CallShell
      meetingId={meeting.id}
      roomCode={meeting.roomCode}
      title={meeting.title}
      localParticipantId={identity.id}
      localParticipantName={identity.displayName}
      isHost={meeting.hostId === identity.id}
    />
  );
}
