import { Mic } from "lucide-react";

import { requireUser } from "@/lib/auth";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /settings/devices — device settings (Phase 4 minimal placeholder).
 * Real device selector UI arrives in Phase 6 (lobby).
 */

export default async function DeviceSettingsPage() {
  await requireUser();

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Mic className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Device Settings</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Camera, microphone, and speaker selection arrives in Phase 6 (pre-join lobby UI).
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            For now, your browser&apos;s default devices will be used.
          </p>
        </div>
      </div>
    </main>
  );
}
