import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { connectRedis, redis } from "../lib/redis.js";
import { AppError } from "./AppError.js";

const codeKey = (email: string) => `otp:email-verify:${email}`;
const attemptsKey = (email: string) => `otp:email-verify:attempts:${email}`;
const cooldownKey = (email: string) => `otp:email-verify:cooldown:${email}`;

const RESEND_COOLDOWN_SECONDS = 60;

const hashCode = (code: string): string => createHash("sha256").update(code).digest("hex");

const matches = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const generateOtp = (): string => {
  const max = 10 ** env.OTP_LENGTH;
  return String(randomInt(0, max)).padStart(env.OTP_LENGTH, "0");
};

export const issueOtp = async (email: string): Promise<string> => {
  await connectRedis();

  const cooldown = await redis.ttl(cooldownKey(email));
  if (cooldown > 0) {
    throw new AppError(429, `Please wait ${cooldown} seconds before requesting another code`);
  }

  const code = generateOtp();
  const ttlSeconds = env.OTP_EXPIRY_MINUTES * 60;

  await redis
    .multi()
    .set(codeKey(email), hashCode(code), "EX", ttlSeconds)
    .del(attemptsKey(email))
    .set(cooldownKey(email), "1", "EX", RESEND_COOLDOWN_SECONDS)
    .exec();

  return code;
};

export const consumeOtp = async (email: string, submitted: string): Promise<void> => {
  await connectRedis();

  const stored = await redis.get(codeKey(email));

  if (stored === null) {
    throw new AppError(410, "This code has expired or was already used. Request a new one.");
  }

  const attempts = await redis.incr(attemptsKey(email));
  await redis.expire(attemptsKey(email), env.OTP_EXPIRY_MINUTES * 60);

  if (attempts > env.OTP_MAX_ATTEMPTS) {
    await redis.del(codeKey(email), attemptsKey(email));
    throw new AppError(429, "Too many incorrect attempts. Request a new code.");
  }

  if (!matches(stored, hashCode(submitted))) {
    const remaining = env.OTP_MAX_ATTEMPTS - attempts;
    throw new AppError(400, `Incorrect code. ${remaining} attempt(s) remaining.`);
  }

  await redis.del(codeKey(email), attemptsKey(email), cooldownKey(email));
};
