import { prisma } from "@/lib/db";
import type { AnonymousIdentity } from "./index";

/**
 * Ensure a User row exists for the anonymous identity.
 * Uses the cookie UUID as the User.id (UUID is valid for String @id).
 */
export async function ensureAnonymousUser(identity: AnonymousIdentity) {
  try {
    await prisma.user.upsert({
      where: { id: identity.id },
      update: { name: identity.displayName },
      create: {
        id: identity.id,
        name: identity.displayName,
        isAnonymous: true,
      },
    });
  } catch {
    // DB may be unavailable in dev/preview without DATABASE_URL — ignore
  }
  return identity;
}
