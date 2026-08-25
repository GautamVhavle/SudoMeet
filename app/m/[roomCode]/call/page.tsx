import Link from "next/link";
import { notFound } from "next/navigation";

import { roomCodeSchema } from "@/lib/validation/meetings";
import { findMeetingByRoomCode } from "@/features/meetings/service";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /m/[roomCode]/call — placeholder call screen (Phase 4).
 * Real call UI + media provider wiring arrives in Phases 7–10.
 */

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function CallPlaceholderPage({ params }: PageProps) {
  const { roomCode } = await params;
  const parsed = roomCodeSchema.safeParse(roomCode);

  if (!parsed.success) {
    notFound();
  }

  const meeting = await findMeetingByRoomCode(parsed.data);
  if (!meeting) {
    notFound();
  }

  // Prepare for Phase 7+: const userId = await getSessionUserId(); const isHost = userId !== null && meeting.hostId === userId;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          SudoMeet · call
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">{meeting.title}</h1>
        <p
          data-testid="call-placeholder"
          className="mt-4 font-mono text-sm text-muted-foreground"
        >
          Call UI ships in Phase 7+ (media provider: {meeting.mediaProvider}).
        </p>
        <Link
          href={`/m/${meeting.roomCode}`}
          className="mt-6 inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-foreground transition-colors hover:bg-muted"
        >
          Back to pre-join
        </Link>
      </div>
    </main>
  );
}
