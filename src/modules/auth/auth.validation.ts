import { z } from "zod";

export const SELF_SERVICE_ROLES = ["FARMER", "WAREHOUSE_OWNER"] as const;

const BANGLADESHI_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;

export const signupSchema = z.object({
  body: z
    .object({
      name: z
        .string({ error: "name is required" })
        .trim()
        .min(2, { error: "name must be at least 2 characters" })
        .max(80, { error: "name must be at most 80 characters" }),

      email: z
        .email({ error: "email must be a valid email address" })
        .trim()
        .toLowerCase()
        .max(255, { error: "email must be at most 255 characters" }),

      password: z
        .string({ error: "password is required" })
        .min(8, { error: "password must be at least 8 characters" })
        .max(72, { error: "password must be at most 72 characters" })
        .regex(/[A-Za-z]/, { error: "password must contain at least one letter" })
        .regex(/\d/, { error: "password must contain at least one number" }),

      phone: z
        .string()
        .trim()
        .regex(BANGLADESHI_PHONE, {
          error: "phone must be a valid Bangladeshi number, e.g. 01712345678",
        })
        .optional(),

      role: z.enum(SELF_SERVICE_ROLES, {
        error:
          "role must be either FARMER or WAREHOUSE_OWNER. ADMIN accounts cannot be created through the API.",
      }),
    })
    .strict(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z
        .email({ error: "email must be a valid email address" })
        .trim()
        .toLowerCase(),

      password: z.string({ error: "password is required" }).min(1, {
        error: "password is required",
      }),
    })
    .strict(),
});

export const verifyOtpSchema = z.object({
  body: z
    .object({
      email: z.email({ error: "email must be a valid email address" }).trim().toLowerCase(),
      otp: z
        .string({ error: "otp is required" })
        .trim()
        .regex(/^\d+$/, { error: "otp must contain digits only" }),
    })
    .strict(),
});

export const resendOtpSchema = z.object({
  body: z
    .object({
      email: z.email({ error: "email must be a valid email address" }).trim().toLowerCase(),
    })
    .strict(),
});

export const refreshTokenSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().trim().min(1).optional(),
    })
    .strict(),
});
