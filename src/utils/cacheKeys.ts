import { createHash } from "node:crypto";
import { connectRedis, redis } from "../lib/redis.js";

const fingerprint = (value: string): string =>
  createHash("sha1").update(value).digest("hex").slice(0, 16);

export const CACHE_TTL = {
  cropTypes: 24 * 60 * 60,
  warehouseList: 60,
  warehouseDetail: 5 * 60,
  warehouseReviews: 5 * 60,
  adminStats: 5 * 60,
} as const;

export const cacheKeys = {
  cropTypes: (query: string) => `cache:croptypes:${fingerprint(query)}`,
  warehouseList: (query: string) => `cache:warehouse:list:${fingerprint(query)}`,
  warehouseDetail: (id: string) => `cache:warehouse:detail:${id}`,
  warehouseReviews: (id: string, query: string) =>
    `cache:warehouse:reviews:${id}:${fingerprint(query)}`,
  adminStats: () => "cache:admin:stats",
} as const;

const deleteByPattern = async (pattern: string): Promise<number> => {
  let cursor = "0";
  let removed = 0;

  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 200);
    cursor = next;

    if (keys.length > 0) {
      removed += await redis.del(...keys);
    }
  } while (cursor !== "0");

  return removed;
};

const safeInvalidate = async (patterns: string[]): Promise<void> => {
  try {
    await connectRedis();
    for (const pattern of patterns) {
      await deleteByPattern(pattern);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Cache invalidation skipped, Redis unreachable: ${reason}`);
  }
};

export const invalidateCropTypeCache = (): Promise<void> =>
  safeInvalidate(["cache:croptypes:*", "cache:warehouse:list:*"]);

export const invalidateWarehouseCache = (warehouseId?: string): Promise<void> =>
  safeInvalidate([
    "cache:warehouse:list:*",
    warehouseId === undefined
      ? "cache:warehouse:detail:*"
      : `cache:warehouse:detail:${warehouseId}`,
    "cache:admin:stats",
  ]);

export const invalidateReviewCache = (warehouseId: string): Promise<void> =>
  safeInvalidate([
    `cache:warehouse:reviews:${warehouseId}:*`,
    `cache:warehouse:detail:${warehouseId}`,
    "cache:warehouse:list:*",
  ]);
