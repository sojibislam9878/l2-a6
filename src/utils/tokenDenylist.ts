import { connectRedis, redis } from "../lib/redis.js";

const revokedKey = (jti: string) => `revoked:jti:${jti}`;

export const revokeJti = async (jti: string, expiresAtEpochSeconds: number): Promise<void> => {
  const ttlSeconds = expiresAtEpochSeconds - Math.floor(Date.now() / 1000);

  if (ttlSeconds <= 0) {
    return;
  }

  await connectRedis();
  await redis.set(revokedKey(jti), "1", "EX", ttlSeconds);
};

export const isJtiRevoked = async (jti: string): Promise<boolean> => {
  try {
    await connectRedis();
    return (await redis.exists(revokedKey(jti))) === 1;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Token denylist unreachable, allowing request: ${reason}`);
    return false;
  }
};
