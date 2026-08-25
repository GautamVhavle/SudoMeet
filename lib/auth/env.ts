// ──────────────────────────────────────────────────────────────────────────────
// SudoMeet — auth environment validation (Phase 3)
//
// Mirrors the lazy getDbEnv() pattern from Phase 2: the app must build and boot
// without OAuth/SMTP credentials configured, so AUTH_* vars are validated on
// first use instead of at module load.
// ──────────────────────────────────────────────────────────────────────────────

let authEnvCache: { secret: string } | undefined;

/**
 * Validate + return the mandatory auth env vars on first use.
 * Throws with an actionable message when AUTH_SECRET is missing so callers
 * fail fast at request time instead of surfacing an opaque JWT error later.
 */
export function getAuthEnv(): { secret: string } {
  if (authEnvCache) return authEnvCache;

  const missing = ["AUTH_SECRET"].filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required auth environment variables: ${missing.join(", ")}\n` +
        "Generate one with: openssl rand -base64 32\n" +
        "Then add it to .env as AUTH_SECRET=<value>.",
    );
  }

  authEnvCache = { secret: process.env.AUTH_SECRET as string };
  return authEnvCache;
}

/**
 * GitHub OAuth credentials, when configured. Absent credentials are NOT an
 * error — the provider is simply omitted from the active provider list (see
 * lib/auth/config.ts). Returns null when either half of the pair is missing
 * so a half-configured setup never produces confusing OAuth redirects.
 */
export function getGitHubOAuthEnv(): {
  clientId: string;
  clientSecret: string;
} | null {
  const id = process.env.AUTH_GITHUB_ID;
  const secret = process.env.AUTH_GITHUB_SECRET;

  if (!id || !secret) return null;
  return { clientId: id, clientSecret: secret };
}

/**
 * SMTP settings for magic-link delivery, when configured.
 * In development without SMTP the send function logs links to the terminal
 * instead (see features/auth/send-magic-link.ts).
 */
export function getSmtpEnv(): {
  host: string;
  port: number;
  user?: string;
  pass?: string;
} | null {
  const host = process.env.EMAIL_SERVER_HOST;
  if (!host) return null;

  return {
    host,
    port: Number(process.env.EMAIL_SERVER_PORT ?? "587"),
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  };
}
