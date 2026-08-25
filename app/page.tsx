import Link from "next/link";
import { Terminal, ArrowRight, Video, Zap, Shield } from "lucide-react";

import { joinByCodeAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export { dynamic } from "@/app/dynamic-exports";

/**
 * Landing page (/) — no sign-in, anonymous cookie identity.
 */
export default async function HomePage() {

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Hero section */}
      <div className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-20 text-center">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
            <Terminal aria-hidden className="size-6 text-accent" />
          </span>
          <h1 className="text-5xl font-bold tracking-tight">SudoMeet</h1>
        </div>

        <div className="max-w-2xl space-y-4">
          <p className="text-xl text-foreground">
            Dark-mode-first video collaboration for developer teams
          </p>
          <p className="text-muted-foreground">
            P2P calls, screen share, and chat — built for the terminal generation.
            No bloat. Just the tools you need.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full mt-8">
          <div className="rounded-xl border border-border bg-background-elevated p-6 text-left">
            <div className="mb-3 inline-flex rounded-lg bg-accent/10 p-2">
              <Video className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">P2P First</h3>
            <p className="text-sm text-muted-foreground">
              Direct peer-to-peer for small teams. Scale to SFU when needed.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background-elevated p-6 text-left">
            <div className="mb-3 inline-flex rounded-lg bg-accent/10 p-2">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">Developer Platform</h3>
            <p className="text-sm text-muted-foreground">
              API keys, webhooks, and SDKs. Build video into your tools.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background-elevated p-6 text-left">
            <div className="mb-3 inline-flex rounded-lg bg-accent/10 p-2">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">Privacy Focused</h3>
            <p className="text-sm text-muted-foreground">
              End-to-end encrypted. Your data stays yours.
            </p>
          </div>
        </div>

        {/* CTAs — no auth */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button asChild size="lg">
            <Link href="/dashboard">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/dashboard">Create meeting</Link>
          </Button>
        </div>

        {/* Join by code */}
        <div className="w-full max-w-sm mt-12 p-6 rounded-xl border border-border bg-background-elevated">
          <p className="mb-3 text-sm font-medium">Join a meeting</p>
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
        </div>
      </div>

      {/* Footer badge */}
      <div className="flex justify-center pb-8">
        <div className="rounded-xl border border-border bg-background-elevated px-4 py-2 font-mono text-xs text-muted-foreground">
          phase 5 · design system
        </div>
      </div>
    </main>
  );
}
