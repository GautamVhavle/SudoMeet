/**
 * API key generation & verification (developer platform foundation).
 *
 * Security model:
 * - Raw keys are shown ONCE at creation and NEVER stored.
 * - Only a short `keyPrefix` (for lookup/UI display) and a SHA-256
 *   `hashedSecret` of the full raw key are persisted.
 * - The random portion uses crypto-grade randomness (32 bytes → 256 bits).
 *
 * Format: `sudomeet_live_<43-char base64url>` (prefix constant + random).
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Constant key prefix — versioned so a future rotation can bump it. */
export const API_KEY_PREFIX = "sudomeet_live" as const;

const RANDOM_BYTES = 32;
/** Length of the stored plaintext fragment, e.g. "sudomeet_live_a1B2" (18). */
export const KEY_PREFIX_DISPLAY_LENGTH = API_KEY_PREFIX.length + 1 + 4;

export interface GeneratedApiKey {
  /** Full raw key — return to the user exactly once, never persist. */
  key: string;
  /** Plaintext fragment stored for lookup/display (e.g. `sudomeet_live_ab12`). */
  keyPrefix: string;
  /** SHA-256 hex digest of the full raw key — the only secret material stored. */
  hashedSecret: string;
}

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

/** SHA-256 hex digest of a raw key. */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/**
 * Generate a new API key.
 *
 * ```ts
 * const { key, keyPrefix, hashedSecret } = generateApiKey();
 * // persist { keyPrefix, hashedSecret } only; show `key` once
 * ```
 */
export function generateApiKey(): GeneratedApiKey {
  const random = base64Url(randomBytes(RANDOM_BYTES));
  const key = `${API_KEY_PREFIX}_${random}`;
  return {
    key,
    keyPrefix: key.slice(0, KEY_PREFIX_DISPLAY_LENGTH),
    hashedSecret: hashApiKey(key),
  };
}

/**
 * Verify a presented raw key against a stored hash.
 * Timing-safe comparison; returns false on any mismatch or malformed input.
 */
export function verifyApiKey(
  presentedKey: string,
  storedHashedSecret: string,
): boolean {
  if (!presentedKey.startsWith(`${API_KEY_PREFIX}_`)) return false;

  const presentedHash = Buffer.from(hashApiKey(presentedKey), "hex");
  const storedHash = Buffer.from(storedHashedSecret, "hex");

  if (presentedHash.length !== storedHash.length) return false;
  return timingSafeEqual(presentedHash, storedHash);
}
