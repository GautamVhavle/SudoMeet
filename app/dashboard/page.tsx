import Link from "next/link";
import { Plus, LogIn, Calendar, Users, Clock } from "lucide-react";

import { getOrCreateIdentity } from "@/lib/identity";
import { ensureAnonymousUser } from "@/lib/identity/ensure-user";
import { getOrCreatePersonalRoom, listMeetingsForUser } from "@/features/meetings/service";
import { createQuickMeeting, joinByCodeAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /dashboard — no auth, anonymous identity (cookie + IP hash).
 */

export default async function DashboardPage() {
  const identity = await getOrCreateIdentity();
  await ensureAnonymousUser(identity);

  let personalRoom: Awaited<ReturnType<typeof getOrCreatePersonalRoom>> | null = null;
  let allMeetings: Awaited<ReturnType<typeof listMeetingsForUser>> = [];
  try {
    personalRoom = await getOrCreatePersonalRoom(identity.id);
    allMeetings = await listMeetingsForUser(identity.id);
  } catch {
    // DB not configured (e.g. Vercel without DATABASE_URL) — show empty state
  }

  const upcoming = allMeetings.filter((m) => m.status === "SCHEDULED");
  const active = allMeetings.filter((m) => m.status === "ACTIVE" || m.status === "WAITING");
  const recent = allMeetings.filter((m) => m.status === "ENDED").slice(0, 10);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome, <span className="font-mono text-accent">{identity.displayName}</span>
          </p>
        </div>

        {/* Personal Room */}
        <section
          data-testid="personal-room-section"
          className="mb-6 rounded-xl border border-border bg-background-elevated p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <Users className="size-5 text-accent" />
            <h2 className="text-lg font-medium text-foreground">Personal Room</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Your stable room for quick calls — always the same link.
          </p>
          {personalRoom ? (
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded-xl border border-border bg-background-subtle px-4 py-3 font-mono text-sm text-foreground">
                /m/{personalRoom.roomCode}
              </code>
              <Button asChild>
                <Link href={`/m/${personalRoom.roomCode}`}>Join</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Database not configured — personal room unavailable.</p>
          )}
        </section>

        {/* Quick Start + Join by Code */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <section
            data-testid="quick-start-section"
            className="rounded-xl border border-border bg-background-elevated p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <Plus className="size-5 text-accent" />
              <h2 className="text-lg font-medium text-foreground">Quick Start</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Create an instant meeting with a new room code.
            </p>
            <form action={createQuickMeeting}>
              <Button type="submit" variant="secondary">
                New Meeting
              </Button>
            </form>
          </section>

          <section
            data-testid="join-by-code-section"
            className="rounded-xl border border-border bg-background-elevated p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <LogIn className="size-5 text-accent" />
              <h2 className="text-lg font-medium text-foreground">Join Meeting</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Enter a room code to join an existing call.
            </p>
            <form action={joinByCodeAction} className="flex gap-2">
              <input
                type="text"
                name="code"
                placeholder="room-code-here"
                pattern="[a-z-]+"
                required
                className="flex-1 h-10 rounded-xl border border-border bg-background-subtle px-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button type="submit" variant="secondary">
                Join
              </Button>
            </form>
          </section>
        </div>

        {/* Upcoming Meetings */}
        <section data-testid="upcoming-section" className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="size-5 text-accent" />
            <h2 className="text-lg font-medium text-foreground">Upcoming</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-xl border border-border bg-background-elevated p-6 text-sm text-muted-foreground">
              No upcoming meetings.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((meeting) => (
                <li
                  key={meeting.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background-elevated p-4 hover:border-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{meeting.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {meeting.roomCode}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/m/${meeting.roomCode}`}>
                      Join
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Active Meetings */}
        <section data-testid="active-section" className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Users className="size-5 text-accent" />
            <h2 className="text-lg font-medium text-foreground">Active</h2>
          </div>
          {active.length === 0 ? (
            <p className="rounded-xl border border-border bg-background-elevated p-6 text-sm text-muted-foreground">
              No active meetings.
            </p>
          ) : (
            <ul className="space-y-2">
              {active.map((meeting) => (
                <li
                  key={meeting.id}
                  className="flex items-center justify-between rounded-xl border border-accent/50 bg-background-elevated p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{meeting.title}</p>
                      <Badge variant="accent" className="text-xs">Live</Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {meeting.roomCode}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="default">
                    <Link href={`/m/${meeting.roomCode}/call`}>
                      Rejoin
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Meetings */}
        <section data-testid="recent-section" className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="size-5 text-accent" />
            <h2 className="text-lg font-medium text-foreground">Recent</h2>
          </div>
          {recent.length === 0 ? (
            <p className="rounded-xl border border-border bg-background-elevated p-6 text-sm text-muted-foreground">
              No recent meetings.
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((meeting) => (
                <li
                  key={meeting.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background-elevated p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{meeting.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {meeting.roomCode} · ended {meeting.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
