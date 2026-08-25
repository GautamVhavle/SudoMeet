/**
 * API key management routes.
 * POST /api/keys — create a new API key
 * GET /api/keys — list user's API keys
 */

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/api/keys";

export { dynamic } from "@/app/dynamic-exports";

interface CreateKeyRequest {
  label: string;
  expiresAt?: string;
}

export async function POST(request: Request): Promise<Response> {
  const userId = await requireUser();

  const body = (await request.json()) as CreateKeyRequest;

  if (!body.label || typeof body.label !== "string") {
    return NextResponse.json(
      { error: "Missing required field: label" },
      { status: 400 }
    );
  }

  const { key, keyPrefix, hashedSecret } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      keyPrefix,
      hashedSecret,
      label: body.label,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  // Return the full key ONCE — it's never shown again
  return NextResponse.json(
    {
      id: apiKey.id,
      key, // <-- shown only on creation
      keyPrefix: apiKey.keyPrefix,
      label: apiKey.label,
      createdAt: apiKey.createdAt.toISOString(),
      expiresAt: apiKey.expiresAt?.toISOString() || null,
    },
    { status: 201 }
  );
}

export async function GET(): Promise<Response> {
  const userId = await requireUser();

  const keys = await prisma.apiKey.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      keyPrefix: true,
      label: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      keyPrefix: k.keyPrefix,
      label: k.label,
      lastUsedAt: k.lastUsedAt?.toISOString() || null,
      expiresAt: k.expiresAt?.toISOString() || null,
      createdAt: k.createdAt.toISOString(),
    })),
  });
}
