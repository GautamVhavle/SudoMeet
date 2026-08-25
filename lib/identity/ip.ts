import { createHash } from "crypto";
import { headers } from "next/headers";

/**
 * Hash IP + UA for fallback identity when cookie is blocked.
 * Never used as primary key — only fallback.
 */
export async function getIpHash(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  const ua = h.get("user-agent") ?? "unknown";
  return createHash("sha256")
    .update(`${ip}:${ua}`)
    .digest("hex")
    .slice(0, 12);
}

export function hashIpUa(ip: string, ua: string): string {
  return createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 12);
}
