/**
 * API authentication middleware — verify API keys from Bearer tokens.
 */

import { headers } from "next/headers";

import { prisma } from "@/lib/db";

import { verifyApiKey } from "./keys";

export interface ApiAuthResult {
  authenticated: boolean;
  apiKey?: {
    id: string;
    userId: string;
    keyPrefix: string;
  };
  error?: string;
}

/**
 * Authenticate API request via Bearer token.
 * Returns the API key if valid, or error if not.
 */
export async function authenticateApiRequest(): Promise<ApiAuthResult> {
  const headersList = await headers();
  const authorization = headersList.get("authorization");

  if (!authorization) {
    return {
      authenticated: false,
      error: "Missing Authorization header",
    };
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/);
  if (!match) {
    return {
      authenticated: false,
      error: "Invalid Authorization format (expected: Bearer <key>)",
    };
  }

  const presentedKey = match[1];

  // Extract key prefix to find candidate keys
  const keyPrefix = presentedKey.slice(0, 18); // "sudomeet_live_xxxx"

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyPrefix },
    select: {
      id: true,
      userId: true,
      keyPrefix: true,
      hashedSecret: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!apiKey) {
    return { authenticated: false, error: "Invalid API key" };
  }

  if (apiKey.revokedAt) {
    return { authenticated: false, error: "API key has been revoked" };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { authenticated: false, error: "API key has expired" };
  }

  // Verify the presented key against stored hash
  if (!verifyApiKey(presentedKey, apiKey.hashedSecret)) {
    return { authenticated: false, error: "Invalid API key" };
  }

  // Update last used timestamp (fire-and-forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) =>
      console.error(`[api-auth] failed to update lastUsedAt:`, err)
    );

  return {
    authenticated: true,
    apiKey: {
      id: apiKey.id,
      userId: apiKey.userId,
      keyPrefix: apiKey.keyPrefix,
    },
  };
}
