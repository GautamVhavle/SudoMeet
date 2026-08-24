import { Terminal } from "lucide-react";

/**
 * Phase 1 placeholder home page — proves the app boots end to end.
 * The real marketing/dashboard experience arrives in Phases 4–6.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
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

      <p className="rounded-md border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
        phase 1 · foundation online
      </p>
    </main>
  );
}
