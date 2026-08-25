import Link from "next/link";
import { Terminal, ArrowRight, LogIn } from "lucide-react";

import { getSessionUserId } from "@/lib/auth";
import { joinByCodeAction } from "@/app/dashboard/actions";

export { dynamic } from "@/app/dynamic-exports";

/**
 * Landing page (/) — Phase 4 update: login/dashboard links + join-by-code.
 */
export default async function HomePage() {
  const userId = await getSessionUserId();
  const isAuthenticated = userId !== null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center text-foreground">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-card">
          <Terminal aria-hidden className="size-5" />
        </span>
        <h1 className="text-4xl font-semibold tracking-tight">SudoMeet</h1>
      </div>

      <p className="max-w-md text-balance text-muted-foreground">
        Dark-mode-first video collaboration for developer teams. P2P calls, screen share,
        and chat — built for the terminal generation.
      </p>

      {/* Auth CTAs */}
      {isAuthenticated ? (
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <Link
          href="/login"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <LogIn className="size-4" />
          Sign In
        </Link>
      )}

      {/* Join by code */}
      <div className="w-full max-w-sm">
        <p className="mb-2 text-sm text-muted-foreground">Or join a meeting by code:</p>
        <form action={joinByCodeAction} className="flex gap-2">
          <input
            type="text"
            name="code"
            placeholder="room-code-here"
            pattern="[a-z-]+"
            required
            className="flex-1 rounded-md border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            Join
          </button>
        </form>
      </div>

      <p className="rounded-md border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
        phase 4 · meetings + dashboard
      </p>
    </main>
  );
}
