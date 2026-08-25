import { getOrCreateIdentity } from "@/lib/identity";
import { ensureAnonymousUser } from "@/lib/identity/ensure-user";

import { ApiKeysUI } from "./ui";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /settings/api-keys — API key management (Phase 13).
 */

export default async function ApiKeysSettingsPage() {
  const identity = await getOrCreateIdentity();
  await ensureAnonymousUser(identity);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <ApiKeysUI />
    </main>
  );
}
