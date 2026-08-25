/**
 * Individual webhook endpoint management.
 * DELETE /api/webhooks/:id — delete a webhook endpoint
 * PATCH /api/webhooks/:id — update webhook endpoint (activate/deactivate)
 */

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export { dynamic } from "@/app/dynamic-exports";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface UpdateWebhookRequest {
  active?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<Response> {
  const userId = await requireUser();
  const { id } = await params;

  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
    select: {
      apiKey: {
        select: { userId: true },
      },
    },
  });

  if (!endpoint) {
    return NextResponse.json(
      { error: "Webhook endpoint not found" },
      { status: 404 }
    );
  }

  if (endpoint.apiKey.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as UpdateWebhookRequest;

  const updated = await prisma.webhookEndpoint.update({
    where: { id },
    data: {
      active: body.active ?? undefined,
    },
  });

  return NextResponse.json({
    id: updated.id,
    active: updated.active,
  });
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<Response> {
  const userId = await requireUser();
  const { id } = await params;

  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
    select: {
      apiKey: {
        select: { userId: true },
      },
    },
  });

  if (!endpoint) {
    return NextResponse.json(
      { error: "Webhook endpoint not found" },
      { status: 404 }
    );
  }

  if (endpoint.apiKey.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.webhookEndpoint.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
