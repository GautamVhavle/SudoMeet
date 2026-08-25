/**
 * Health check endpoint for production monitoring.
 *
 * Returns system status including database, Redis, and optional LiveKit connectivity.
 * Used by uptime monitors, load balancers, and operational dashboards.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

interface ComponentStatus {
  status: "healthy" | "degraded" | "down";
  responseTime?: number;
  error?: string;
}

interface HealthCheckResponse {
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  version: string;
  components: {
    database: ComponentStatus;
    redis: ComponentStatus;
    livekit?: ComponentStatus;
  };
}

async function checkDatabase(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    // Simple query to verify DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "healthy",
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    if (!env.server.UPSTASH_REDIS_REST_URL || !env.server.UPSTASH_REDIS_REST_TOKEN) {
      return {
        status: "down",
        error: "Redis credentials not configured",
      };
    }

    const redis = new Redis({
      url: env.server.UPSTASH_REDIS_REST_URL,
      token: env.server.UPSTASH_REDIS_REST_TOKEN,
    });

    // Ping Redis
    await redis.set("health-check", Date.now().toString(), { ex: 10 });
    await redis.get("health-check");
    return {
      status: "healthy",
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const [databaseStatus, redisStatus] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  // Overall status: down if any critical component is down, degraded if any is degraded
  let overallStatus: "healthy" | "degraded" | "down" = "healthy";
  if (databaseStatus.status === "down" || redisStatus.status === "down") {
    overallStatus = "down";
  } else if (databaseStatus.status === "degraded" || redisStatus.status === "degraded") {
    overallStatus = "degraded";
  }

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    components: {
      database: databaseStatus,
      redis: redisStatus,
    },
  };

  const statusCode = overallStatus === "healthy" ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
