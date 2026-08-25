/**
 * Webhook endpoint management.
 * POST /api/webhooks — create a webhook endpoint
 * GET /api/webhooks — list user's webhook endpoints
 */

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/types";

export { dynamic } from "@/app/dynamic-exports";

interface CreateWebhookRequest {
  apiKeyId: string;
  url: string;
  events: string[];
}

export async function POST(request: Request): Promise<Response> {
  const userId = await requireUser();

  const body = (await request.json()) as CreateWebhookRequest;

  if (!body.apiKeyId || !body.url || !Array.isArray(body.events)) {
    return NextResponse.json(
      { error: "Missing required fields: apiKeyId, url, events" },
      { status: 400 }
    );
  }

  // Validate API key ownership
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: body.apiKeyId },
    select: { userId: true, revokedAt: true },
  });

  if (!apiKey || apiKey.userId !== userId) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
  }

  if (apiKey.revokedAt) {
    return NextResponse.json(
      { error: "Cannot create webhook for revoked API key" },
      { status: 400 }
    );
  }

  // Validate events
  const validEvents = body.events.filter((e) =>
    WEBHOOK_EVENTS.includes(e as never)
  );

  if (validEvents.length === 0) {
    return NextResponse.json(
      { error: "No valid events specified" },
      { status: 400 }
    );
  }

  // Generate HMAC signing secret
  const secret = randomBytes(32).toString("hex");

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      apiKeyId: body.apiKeyId,
      url: body.url,
      secret,
      events: validEvents,
    },
  });

  return NextResponse.json(
    {
      id: endpoint.id,
      url: endpoint.url,
      secret, // <-- shown only on creation
      events: endpoint.events,
      active: endpoint.active,
      createdAt: endpoint.createdAt.toISOString(),
    },
    { status: 201 }
  );
}

export async function GET(): Promise<Response> {
  const userId = await requireUser();

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      apiKey: {
        userId,
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ endpoints });
}
