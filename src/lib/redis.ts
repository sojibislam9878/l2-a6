import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
  lazyConnect: true,
});

let connecting: Promise<void> | null = null;

export const connectRedis = async (): Promise<void> => {
  if (redis.status === "ready") return;
  if (connecting === null) {
    connecting = redis.connect().catch((error: unknown) => {
      connecting = null;
      throw error;
    });
  }
  await connecting;
};

redis.on("error", (error: Error) => {
  console.error("Redis error:", error.message);
});
