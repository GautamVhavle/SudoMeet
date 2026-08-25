import { cookies } from "next/headers";
import type { GuestIdentity } from "@/lib/validation/auth";

/**
 * Retrieve persisted guest identity from httpOnly cookie.
 * Returns null if no cookie found or JSON parse fails.
 */
export async function getGuestIdentity(): Promise<GuestIdentity | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("sudomeet_guest");

  if (!cookie?.value) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(cookie.value);
    const identity = JSON.parse(decoded) as GuestIdentity;

    // Basic shape validation
    if (
      identity.kind === "guest" &&
      typeof identity.guestId === "string" &&
      typeof identity.displayName === "string"
    ) {
      return identity;
    }

    return null;
  } catch {
    return null;
  }
}
