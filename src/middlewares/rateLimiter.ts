import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { connectRedis, redis } from "../lib/redis.js";

const MINUTE = 60 * 1000;
const FIFTEEN_MINUTES = 15 * MINUTE;

const createStore = (prefix: string) =>
  new RedisStore({
    prefix: `ratelimit:${prefix}:`,
    sendCommand: async (...args: string[]) => {
      await connectRedis();
      const [command, ...rest] = args;
      return redis.call(command as string, ...rest) as Promise<never>;
    },
  });

const perUserKey = (req: Request): string => req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown");

type LimiterConfig = {
  prefix: string;
  windowMs: number;
  limit: number;
  message: string;
  perUser: boolean;
};

const buildLimiter = (config: LimiterConfig) =>
  rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    passOnStoreError: true,
    store: createStore(config.prefix),
    ...(config.perUser ? { keyGenerator: perUserKey } : {}),
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        success: false,
        message: `${config.message} Limit is ${config.limit} request(s) per ${Math.round(options.windowMs / MINUTE)} minute(s).`,
        errors: [],
      });
    },
  });

export const globalLimiter = buildLimiter({
  prefix: "global",
  windowMs: FIFTEEN_MINUTES,
  limit: 300,
  message: "Too many requests from this address.",
  perUser: false,
});

export const authLimiter = buildLimiter({
  prefix: "auth",
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  message: "Too many authentication attempts from this address.",
  perUser: false,
});

export const otpLimiter = buildLimiter({
  prefix: "otp",
  windowMs: FIFTEEN_MINUTES,
  limit: 6,
  message: "Too many verification code requests from this address.",
  perUser: false,
});

export const bookingLimiter = buildLimiter({
  prefix: "booking",
  windowMs: MINUTE,
  limit: 10,
  message: "Too many booking attempts.",
  perUser: true,
});

export const paymentLimiter = buildLimiter({
  prefix: "payment",
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  message: "Too many payment session requests.",
  perUser: true,
});
