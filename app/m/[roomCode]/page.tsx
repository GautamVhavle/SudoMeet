import Link from "next/link";
import { notFound } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import { roomCodeSchema } from "@/lib/validation/meetings";
import { findMeetingByRoomCode } from "@/features/meetings/service";
import { computeExpiry } from "@/features/meetings/lifecycle";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /m/[roomCode] — pre-join entry page (Phase 4 functional shell).
 *
 * Resolution order:
 *   1. Malformed code            → 404
 *   2. Unknown code              → 404
 *   3. Deleted room              → 404 (row is gone)
 *   4. Expired                   → 404-style expired screen
 *   5. Ended                     → ended screen
 *   6. Locked + non-host         → locked screen (approval/waiting path)
 *   7. OK                        → pre-join card with Join button
 *
 * The lobby/device UI is Phase 6; this page stays deliberately functional.
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

  const userId = await getSessionUserId();
  const isHost = userId !== null && meeting.hostId === userId;

  const expiry = computeExpiry(meeting.status, meeting.expiresAt);
  const expired = expiry.expired || meeting.status === "EXPIRED";
  const ended = meeting.status === "ENDED";
  const lockedForGuest = meeting.isLocked && !isHost;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          SudoMeet · /m/{meeting.roomCode}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{meeting.title}</h1>

        <dl className="mt-4 space-y-1 font-mono text-sm text-muted-foreground">
          <div className="flex justify-between">
            <dt>status</dt>
            <dd data-testid="meeting-status">{meeting.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt>role</dt>
            <dd>{isHost ? "host" : userId ? "participant" : "guest"}</dd>
          </div>
        </dl>

        {expired ? (
          <MeetingNotice
            title="This meeting has expired"
            body="The room link is no longer active. Ask the host for a fresh invite."
          />
        ) : ended ? (
          <MeetingNotice
            title="This meeting has ended"
            body="Thanks for stopping by — the host can start a new meeting anytime."
          />
        ) : lockedForGuest ? (
          <MeetingNotice
            title="Room locked"
            body="The host has locked this room. You'll need their approval to join."
          />
        ) : (
          <>
            {lockedForGuest === false && !isHost && meeting.requiresHostApproval ? (
              <p className="mt-4 rounded border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                This room requires host approval — you&apos;ll wait in the lobby after joining.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={`/m/${meeting.roomCode}/call`}
                data-testid="join-call-link"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {isHost ? "Start call" : "Join call"}
              </Link>
              {!userId ? (
                <p className="text-center text-xs text-muted-foreground">
                  Joining as guest —{" "}
                  <Link href="/login" className="underline underline-offset-2">
                    sign in instead
                  </Link>
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function MeetingNotice({ title, body }: { title: string; body: string }) {
  return (
    <div
      data-testid="meeting-unavailable"
      className="mt-6 rounded-md border border-border bg-muted px-4 py-3"
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
