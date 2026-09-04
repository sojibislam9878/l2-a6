import type { Request, RequestHandler } from "express";
import { connectRedis, redis } from "../lib/redis.js";

type KeyBuilder = (req: Request) => string;

export const cacheResponse = (ttlSeconds: number, buildKey: KeyBuilder): RequestHandler => {
  return (req, res, next) => {
    let key: string;

    try {
      key = buildKey(req);
    } catch {
      next();
      return;
    }

    void (async () => {
      try {
        await connectRedis();
        const cached = await redis.get(key);

        if (cached !== null) {
          res.setHeader("X-Cache", "HIT");
          res.type("application/json").send(cached);
          return;
        }

        res.setHeader("X-Cache", "MISS");

        const sendJson = res.json.bind(res);

        res.json = ((body: unknown) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            void redis.set(key, JSON.stringify(body), "EX", ttlSeconds).catch(() => undefined);
          }
          return sendJson(body);
        }) as typeof res.json;

        next();
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(`Cache bypassed, Redis unreachable: ${reason}`);
        res.setHeader("X-Cache", "BYPASS");
        next();
      }
    })();
  };
};

export const queryOf = (req: Request): string => {
  const url = req.originalUrl;
  const index = url.indexOf("?");
  return index === -1 ? "" : url.slice(index + 1);
};
