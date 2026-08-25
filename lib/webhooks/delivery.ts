/**
 * Webhook delivery with HMAC signature, retry logic, and dead-letter handling.
 */

import { createHmac } from "node:crypto";

import { prisma } from "@/lib/db";

import type { WebhookEventType, WebhookPayload } from "./types";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms

interface DeliveryOptions {
  endpointId: string;
  eventType: WebhookEventType;
  payload: WebhookPayload;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Verify webhook signature (for incoming webhooks from external systems).
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(payload, secret);
  if (expected.length !== signature.length) return false;

  // Timing-safe comparison
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Deliver webhook event to an endpoint with retries.
 */
export async function deliverWebhook(options: DeliveryOptions): Promise<void> {
  const { endpointId, eventType, payload } = options;

  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint || !endpoint.active) {
    console.warn(`[webhooks] endpoint ${endpointId} not found or inactive`);
    return;
  }

  // Check if this event type is subscribed
  if (!endpoint.events.includes(eventType)) {
    return;
  }

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      endpointId,
      eventType,
      payload: payload as unknown as import("@prisma/client").Prisma.InputJsonValue,
      attempts: 0,
    },
  });

  const payloadString = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = signPayload(payloadString, endpoint.secret);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SudoMeet-Signature": signature,
          "X-SudoMeet-Event": eventType,
          "X-SudoMeet-Timestamp": timestamp,
          "X-SudoMeet-Delivery": webhookEvent.id,
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (response.ok) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            deliveredAt: new Date(),
            attempts: attempt + 1,
          },
        });
        return;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          attempts: attempt + 1,
          lastError: errorMessage,
        },
      });

      if (attempt < MAX_ATTEMPTS - 1) {
        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS[attempt])
        );
      } else {
        // All attempts exhausted — dead letter
        console.error(
          `[webhooks] delivery failed after ${MAX_ATTEMPTS} attempts:`,
          {
            endpointId,
            eventType,
            error: errorMessage,
          }
        );
      }
    }
  }
}

/**
 * Emit a webhook event to all matching endpoints (background delivery).
 */
export async function emitWebhookEvent(
  eventType: WebhookEventType,
  payload: WebhookPayload
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      active: true,
      events: {
        has: eventType,
      },
    },
  });

  // Fire and forget — don't await delivery
  for (const endpoint of endpoints) {
    deliverWebhook({ endpointId: endpoint.id, eventType, payload }).catch(
      (err) =>
        console.error(`[webhooks] background delivery error:`, err.message)
    );
  }
}
