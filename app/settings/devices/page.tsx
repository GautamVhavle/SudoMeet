import Link from "next/link";
import { ArrowLeft, Mic } from "lucide-react";

import { getOrCreateIdentity } from "@/lib/identity";
import { ensureAnonymousUser } from "@/lib/identity/ensure-user";
import { DeviceSettings } from "./device-settings";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /settings/devices — camera, microphone and speaker selection with preview.
 */

export default async function DeviceSettingsPage() {
  const identity = await getOrCreateIdentity();
  await ensureAnonymousUser(identity);

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Settings
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <Mic className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Devices</h1>
        </div>

        <DeviceSettings />
      </div>
    </main>
  );
}
