import { randomInt, randomUUID } from "node:crypto";

/**
 * Human-friendly room codes and slugs (Phase 4).
 *
 * Format constraints come from `lib/validation/meetings.ts`:
 *   roomCode := ^[a-z]+(-[a-z]+)*$   e.g. "amber-otter-mosaic"
 *
 * Codes are generated server-side ONLY (never trusted from the client) using
 * crypto-random selection. Collision handling is the caller's job: the service
 * layer retries on Prisma P2002 unique-violation.
 */

const ADJECTIVES: readonly string[] = [
  "amber", "brisk", "calm", "clever", "cosmic", "crisp", "dapper", "eager",
  "fancy", "gentle", "glad", "golden", "grand", "happy", "hazel", "ivory",
  "jolly", "keen", "lively", "lucid", "mellow", "minty", "noble", "olive",
  "peppy", "plush", "quiet", "rapid", "royal", "rustic", "sharp", "silky",
  "smart", "smooth", "snappy", "solid", "spicy", "sunny", "swift", "tender",
  "tidy", "ultra", "vivid", "warm", "wise", "witty", "zesty", "bold",
];

const NOUNS: readonly string[] = [
  "otter", "falcon", "maple", "harbor", "meadow", "summit", "canyon", "comet",
  "ember", "forest", "glacier", "island", "juniper", "lantern", "marble",
  "nebula", "oasis", "pebble", "quartz", "river", "saffron", "thunder",
  "umbra", "valley", "willow", "zenith", "anchor", "beacon", "cedar",
  "dolphin", "eagle", "fjord", "garden", "hammock", "iris", "jasmine",
  "kayak", "lagoon", "mosaic", "nectar", "onyx", "prairie", "quiver",
  "ripple", "sparrow", "tundra", "vertex", "walnut",
];

const VERBS: readonly string[] = [
  "chat", "sync", "talk", "meet", "huddle", "gather", "pair", "share",
  "build", "ship", "debug", "deploy", "merge", "patch", "refactor", "review",
  "standup", "demo", "sketch", "plan",
];

function pick(list: readonly string[]): string {
  return list[randomInt(0, list.length)]!;
}

/**
 * Generate a random three-word room code, e.g. "amber-otter-sync".
 * Entropy ≈ log2(48 × 48 × 20) ≈ 15.4 bits of words — fine for invite links;
 * uniqueness is enforced by the DB unique constraint + caller retry loop.
 */
export function generateRoomCode(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${pick(VERBS)}`;
}

/** Lowercase, collapse non-alphanumerics to single dashes, trim dashes. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/** Short random letter suffix so slugs never collide across same-titled meetings. */
export function randomSlugSuffix(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SLUG_ALPHABET[randomInt(0, SLUG_ALPHABET.length)];
  }
  return out;
}

/** Full unique slug candidate: "<slugified-title>-<random-suffix>". */
export function generateSlug(title: string): string {
  const base = slugify(title) || "meeting";
  return `${base}-${randomSlugSuffix()}`;
}

/** Stable personal-room slug key for a user (unique via Meeting.slug). */
export function personalRoomSlug(userId: string): string {
  return `personal-${userId}`;
}

/** Canonical join URL for a room code, e.g. https://sudomeet…/m/amber-otter-sync */
export function buildJoinUrl(appUrl: string, roomCode: string): string {
  const trimmed = appUrl.replace(/\/+$/, "");
  return `${trimmed}/m/${roomCode}`;
}

/** Test/debug helper — not used in production paths. */
export function newCorrelationId(): string {
  return randomUUID();
}
