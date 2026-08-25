import { Key } from "lucide-react";

import { requireUser } from "@/lib/auth";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /settings/api-keys — API key management (Phase 4 minimal placeholder).
 * Real developer platform UI arrives in Phase 13.
 */

export default async function ApiKeysSettingsPage() {
  await requireUser();

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Key className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">API Keys</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Developer API key generation and management arrives in Phase 13.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            For now, this is a placeholder — the underlying ApiKey model and validation are ready.
          </p>
        </div>
      </div>
    </main>
  );
}
