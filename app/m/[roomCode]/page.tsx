import { notFound } from "next/navigation";

import { getOrCreateIdentity } from "@/lib/identity";
import { ensureAnonymousUser } from "@/lib/identity/ensure-user";
import { roomCodeSchema } from "@/lib/validation/meetings";
import { findMeetingByRoomCode } from "@/features/meetings/service";
import { computeExpiry } from "@/features/meetings/lifecycle";
import { LobbyShell } from "./lobby-shell";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /m/[roomCode] — full pre-join lobby (Phase 6).
 *
 * Resolution order:
 *   1. Malformed code            → 404
 *   2. Unknown code              → 404
 *   3. Deleted room              → 404 (row is gone)
 *   4. Expired                   → expired screen
 *   5. Ended                     → ended screen
 *   6. Locked + non-host         → locked screen (approval/waiting path)
 *   7. OK                        → lobby with device preview + Join button
 */

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function MeetingEntryPage({ params }: PageProps) {
  const { roomCode } = await params;
  const parsed = roomCodeSchema.safeParse(roomCode);

  if (!parsed.success) {
    notFound();
  }

  const meeting = await findMeetingByRoomCode(parsed.data);
  if (!meeting) {
    notFound();
  }

  const identity = await getOrCreateIdentity();
  await ensureAnonymousUser(identity);
  const userId = identity.id;
  const guestIdentity = { kind: "guest" as const, guestId: identity.id, displayName: identity.displayName, createdAt: new Date().toISOString() };
  const isHost = meeting.hostId === userId;

  const expiry = computeExpiry(meeting.status, meeting.expiresAt);
  const expired = expiry.expired || meeting.status === "EXPIRED";
  const ended = meeting.status === "ENDED";
  const lockedForGuest = meeting.isLocked && !isHost;

  return (
    <LobbyShell
      meeting={meeting}
      userId={userId}
      guestIdentity={guestIdentity}
      isHost={isHost}
      expired={expired}
      ended={ended}
      lockedForGuest={lockedForGuest}
    />
  );
}
