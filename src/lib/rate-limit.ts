import "server-only";
import { db } from "@/lib/db";

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: Date;
};

/**
 * Simple DB-backed sliding window rate limiter.
 * Suitable for single-node / foundation; swap for Redis in multi-region.
 */
export async function rateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const existing = await db.rateLimitBucket.findUnique({
    where: { bucketKey },
  });

  if (!existing) {
    await db.rateLimitBucket.create({
      data: { bucketKey, count: 1, windowStart: now },
    });
    return {
      success: true,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }

  const elapsed = now.getTime() - existing.windowStart.getTime();
  if (elapsed > windowMs) {
    await db.rateLimitBucket.update({
      where: { bucketKey },
      data: { count: 1, windowStart: now },
    });
    return {
      success: true,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }

  if (existing.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: new Date(existing.windowStart.getTime() + windowMs),
    };
  }

  await db.rateLimitBucket.update({
    where: { bucketKey },
    data: { count: existing.count + 1 },
  });

  return {
    success: true,
    remaining: limit - existing.count - 1,
    resetAt: new Date(existing.windowStart.getTime() + windowMs),
  };
}
