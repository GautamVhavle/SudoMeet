/**
 * Individual API key management.
 * DELETE /api/keys/:id — revoke an API key
 */

import { NextResponse } from "next/server";

import { getOrCreateIdentity } from "@/lib/identity";
import { ensureAnonymousUser } from "@/lib/identity/ensure-user";
import { prisma } from "@/lib/db";

export { dynamic } from "@/app/dynamic-exports";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<Response> {
  const identity = await getOrCreateIdentity();
  await ensureAnonymousUser(identity);
  const userId = identity.id;
  const { id } = await params;

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  if (apiKey.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
