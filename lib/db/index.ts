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
  getDbEnv();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getOrCreatePrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

// Lazy proxy — does not call getDbEnv() at import time, only on first property access.
// This prevents Vercel (without DATABASE_URL) from crashing on every page import.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getOrCreatePrismaClient();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
