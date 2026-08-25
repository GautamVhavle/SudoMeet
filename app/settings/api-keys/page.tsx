import { requireUser } from "@/lib/auth";

import { ApiKeysUI } from "./ui";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /settings/api-keys — API key management (Phase 13).
 */

export default async function ApiKeysSettingsPage() {
  await requireUser();

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <ApiKeysUI />
    </main>
  );
}
