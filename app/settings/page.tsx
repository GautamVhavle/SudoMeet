import Link from "next/link";
import { Settings } from "lucide-react";

import { requireUser } from "@/lib/auth";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /settings — settings hub (Phase 4 minimal placeholder).
 * Real settings UI arrives in later phases.
 */

export default async function SettingsPage() {
  await requireUser(); // auth required

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Settings className="size-6 text-muted-foreground" />
          <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        </div>

        <nav className="space-y-2">
          <Link
            href="/settings/profile"
            className="block rounded-lg border border-border bg-card p-4 text-foreground hover:bg-muted"
          >
            <h2 className="font-medium">Profile</h2>
            <p className="text-sm text-muted-foreground">
              Manage your name, email, and avatar.
            </p>
          </Link>

          <Link
            href="/settings/devices"
            className="block rounded-lg border border-border bg-card p-4 text-foreground hover:bg-muted"
          >
            <h2 className="font-medium">Devices</h2>
            <p className="text-sm text-muted-foreground">
              Configure camera, microphone, and speaker settings.
            </p>
          </Link>

          <Link
            href="/settings/api-keys"
            className="block rounded-lg border border-border bg-card p-4 text-foreground hover:bg-muted"
          >
            <h2 className="font-medium">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Generate and manage developer API keys.
            </p>
          </Link>
        </nav>
      </div>
    </main>
  );
}
