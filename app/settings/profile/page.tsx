import { User } from "lucide-react";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export { dynamic } from "@/app/dynamic-exports";

/**
 * /settings/profile — profile settings (Phase 4 minimal placeholder).
 */

export default async function ProfileSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <User className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Profile Settings</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Profile editing UI arrives in a later phase.
          </p>

          <dl className="space-y-3 font-mono text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="text-foreground">{user.name ?? "(not set)"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">{user.email ?? "(not set)"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="text-foreground">{user.id}</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
