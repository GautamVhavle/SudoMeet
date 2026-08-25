/**
 * Server actions for dashboard (Phase 4).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrCreateIdentity } from "@/lib/identity";
import { ensureAnonymousUser } from "@/lib/identity/ensure-user";
import { createMeeting } from "@/features/meetings/service";

export async function createQuickMeeting() {
  "use server";

  const identity = await getOrCreateIdentity();
  await ensureAnonymousUser(identity);

  const meeting = await createMeeting(identity.id, {
    title: "Quick Meeting",
    scheduled: false,
  });

  revalidatePath("/dashboard");
  redirect(`/m/${meeting.roomCode}`);
}

export async function joinByCodeAction(formData: FormData) {
  "use server";

  const code = formData.get("code");

  if (typeof code !== "string" || code.trim().length === 0) {
    redirect("/");
  }

  redirect(`/m/${code.trim().toLowerCase()}`);
}
