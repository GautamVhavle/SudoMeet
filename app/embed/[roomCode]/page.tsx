/**
 * Embeddable meeting widget.
 * /embed/[roomCode] — iframe-embeddable meeting view.
 *
 * Phase 13: minimal embed implementation.
 * Later phases can add SDK (@sudomeet/sdk) and customization options.
 */

import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";

export { dynamic } from "@/app/dynamic-exports";

interface EmbedPageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { roomCode } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { roomCode },
    select: { id: true, status: true, isLocked: true },
  });

  if (!meeting) {
    notFound();
  }

  if (meeting.status === "ENDED" || meeting.status === "EXPIRED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Meeting Ended</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This meeting is no longer available.
          </p>
        </div>
      </div>
    );
  }

  // Redirect to the main meeting page
  // In a full implementation, this would render a minimal embed-specific UI
  redirect(`/m/${roomCode}`);
}
