import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const required = (hint: string) => z.string({ error: hint }).trim().min(1, { error: hint });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    APP_URL: z.url({ error: "APP_URL must be a full URL, e.g. http://localhost:5000" }),
    FRONTEND_URL: z.url({ error: "FRONTEND_URL must be a full URL" }),

    DATABASE_URL: required(
      "DATABASE_URL is empty — paste the DIRECT string (db.prisma.io) from console.prisma.io",
    ),

    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

    JWT_ACCESS_SECRET: z
      .string()
      .min(32, { error: "JWT_ACCESS_SECRET must be at least 32 characters" }),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, { error: "JWT_REFRESH_SECRET must be at least 32 characters" }),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    GOOGLE_CLIENT_ID: required(
      "GOOGLE_CLIENT_ID is empty — GCP Console → APIs & Services → Credentials",
    ),
    GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET is empty — same GCP OAuth client"),
    GOOGLE_REDIRECT_URI: z.url({
      error: "GOOGLE_REDIRECT_URI must be a full URL and must match the GCP client exactly",
    }),

    STRIPE_SECRET_KEY: required(
      "STRIPE_SECRET_KEY is empty — Stripe Dashboard → Developers → API keys (use the sk_test_ key)",
    ),
    STRIPE_WEBHOOK_SECRET: z.string().trim().default(""),
    DEMO_FX_RATE: z.coerce.number().positive().default(0.0085),

    REDIS_URL: required("REDIS_URL is empty — console.upstash.com → Connect → ioredis (rediss://…)"),
  })
  .superRefine((val, ctx) => {
    if (val.DATABASE_URL.includes("pooled.db.prisma.io")) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message:
          "DATABASE_URL is the POOLED string, and this project has no DIRECT_URL — prisma migrate will hang on the advisory lock. Use the direct string (db.prisma.io) from console.prisma.io",
      });
    }

    if (val.JWT_ACCESS_SECRET === val.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET",
      });
    }

    if (val.NODE_ENV !== "production" && val.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
      ctx.addIssue({
        code: "custom",
        path: ["STRIPE_SECRET_KEY"],
        message: `Live Stripe key used with NODE_ENV=${val.NODE_ENV} — use the sk_test_ key locally`,
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  ✗ ${issue.path.join(".") || "(root)"} — ${issue.message}`)
    .join("\n");

  console.error(
    [
      "",
      "─".repeat(72),
      " Invalid environment configuration — the server will not start.",
      "─".repeat(72),
      problems,
      "",
      " Fix these in .env, then run again.",
      "─".repeat(72),
      "",
    ].join("\n"),
  );

  throw new Error(`Invalid environment configuration (${parsed.error.issues.length} problem(s))`);
}

export const env = Object.freeze(parsed.data);

export const isStripeWebhookConfigured = env.STRIPE_WEBHOOK_SECRET.length > 0;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

export type Env = typeof env;
