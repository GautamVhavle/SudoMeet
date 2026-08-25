import { z } from "zod";

/**
 * Environment validation — fails fast at build/startup, not mid-call.
 *
 * Phase 1 validates the full variable list from Phase 2's env plan so names
 * are locked in now. Only NEXT_PUBLIC_APP_URL is required today; server-side
 * integrations (database, auth, Redis, LiveKit, R2) become `required` in the
 * phases that consume them.
 *
 * See docs/adr/ADR-003-vercel-control-plane-only.md for why media vars never
 * route traffic through Vercel.
 */

const serverSchema = z.object({
  /** Neon Postgres pooled connection string (Phase 2). */
  DATABASE_URL: z.string().min(1).optional(),
  /** Neon direct connection used by Prisma Migrate (Phase 2). */
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  /** Auth.js secret for signing session tokens (Phase 3). */
  AUTH_SECRET: z.string().min(1).optional(),
  /** GitHub OAuth app client id (Phase 3). */
  AUTH_GITHUB_ID: z.string().min(1).optional(),
  /** GitHub OAuth app client secret (Phase 3). */
  AUTH_GITHUB_SECRET: z.string().min(1).optional(),
  /** Upstash Redis REST URL — pub/sub, presence, SSE signaling relay. */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  /** Upstash Redis REST token. */
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  /** LiveKit server URL for Tier B SFU calls (Phase 11). */
  LIVEKIT_URL: z.string().url().optional(),
  /** LiveKit API key for join-token minting (Phase 11). */
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  /** LiveKit API secret (Phase 11). */
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
  /** Cloudflare R2 bucket for recordings (Tier B egress). */
  R2_BUCKET: z.string().min(1).optional(),
  /** R2 access key id. */
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  /** R2 secret access key. */
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
});

const clientSchema = z.object({
  /** Canonical public origin, e.g. https://sudomeet-v1.vercel.app */
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

/**
 * Parse and validate all environment variables.
 * Throws a single aggregated error listing every problem — fail fast.
 */
export function validateEnv(source: NodeJS.ProcessEnv = process.env): {
  server: ServerEnv;
  client: ClientEnv;
} {
  const parsedServer = serverSchema.safeParse(source);
  const parsedClient = clientSchema.safeParse(source);

  if (!parsedServer.success || !parsedClient.success) {
    const problems = [
      ...(parsedServer.success ? [] : [formatIssues(parsedServer.error)]),
      ...(parsedClient.success ? [] : [formatIssues(parsedClient.error)]),
    ].join("\n");

    throw new Error(
      `❌ Invalid environment variables:\n${problems}\n\n` +
        "Copy .env.example to .env.local and fill in the values.",
    );
  }

  return { server: parsedServer.data, client: parsedClient.data };
}

/**
 * Validated environment. Import this — never read process.env directly.
 *
 * NOTE: Phase 2 made DATABASE_URL / DIRECT_DATABASE_URL lazily validated via
 * getDbEnv() so that `npm run build` succeeds without any database configured
 * (build-time code must not require a live DB). Server code that touches the
 * database imports getDbEnv() (or the prisma singleton, which calls it) and
 * fails fast with an actionable message when the vars are absent.
 */
export const env = validateEnv();

// ── Lazy server-feature validation ───────────────────────────────────────────

let dbEnvCache: { databaseUrl: string; directDatabaseUrl: string } | undefined;

/**
 * Validate + return the database connection env vars on first use.
 * Throws a single aggregated error when either variable is missing so callers
 * fail fast at request time instead of mid-query with an opaque Prisma error.
 */
export function getDbEnv(): {
  databaseUrl: string;
  directDatabaseUrl: string;
} {
  if (dbEnvCache) return dbEnvCache;

  const required = ["DATABASE_URL", "DIRECT_DATABASE_URL"] as const;
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required database environment variables: ${missing.join(", ")}\n` +
        "Copy .env.example to .env and set DATABASE_URL / DIRECT_DATABASE_URL.",
    );
  }

  dbEnvCache = {
    databaseUrl: process.env.DATABASE_URL as string,
    directDatabaseUrl: process.env.DIRECT_DATABASE_URL as string,
  };
  return dbEnvCache;
}
