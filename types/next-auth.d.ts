import type { DefaultSession } from "next-auth";

/**
 * Session type augmentation — makes `session.user.id` available everywhere.
 *
 * With the Prisma adapter + database sessions, `id` is populated by the
 * adapter's session callback; for guest/JWT contexts it comes from the JWT
 * callback in lib/auth/config.ts. Phase 4+ reads it via requireUser().
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
