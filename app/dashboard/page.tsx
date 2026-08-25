import Link from "next/link";
import { Plus, LogIn, Calendar, Users, Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { getOrCreatePersonalRoom, listMeetingsForUser } from "@/features/meetings/service";
import { createQuickMeeting, joinByCodeAction } from "./actions";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /dashboard — authenticated home (Phase 5: design system applied).
 *
 * Sections:
 * - Personal Room (stable per-user room)
 * - Quick Start (instant meeting)
 * - Join by code
 * - Upcoming (status SCHEDULED)
 * - Active (status ACTIVE or WAITING)
 * - Recent (status ENDED, newest first)
 */

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = session.user;

  const personalRoom = await getOrCreatePersonalRoom(user.id);
  const allMeetings = await listMeetingsForUser(user.id);

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
            Welcome back, <span className="font-mono text-accent">{user.name ?? user.email}</span>
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
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-xl border border-border bg-background-subtle px-4 py-3 font-mono text-sm text-foreground">
              /m/{personalRoom.roomCode}
            </code>
            <Button asChild>
              <Link href={`/m/${personalRoom.roomCode}`}>
                Join
              </Link>
            </Button>
          </div>
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
