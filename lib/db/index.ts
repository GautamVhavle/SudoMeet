import { PrismaClient } from "@prisma/client";

import { getDbEnv } from "@/lib/env";

/**
 * PrismaClient singleton.
 *
 * - Guarded against accidental client-bundle imports (throws in the browser).
 * - Reused across HMR reloads in development via globalThis.
 * - Fails fast with an actionable message when DB env vars are missing,
 *   instead of surfacing an opaque Prisma initialization error later.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

if (typeof window !== "undefined") {
  throw new Error(
    "[sudomeet] lib/db must only be imported from server code (route handlers, server components, scripts).",
  );
}

function createPrismaClient(): PrismaClient {
  // Validates DATABASE_URL / DIRECT_DATABASE_URL presence with a clear error.
  getDbEnv();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
