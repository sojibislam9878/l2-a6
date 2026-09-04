import { z } from "zod";

const BANGLADESHI_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;

export const updateMeSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, { error: "name must be at least 2 characters" })
        .max(80, { error: "name must be at most 80 characters" })
        .optional(),

      phone: z
        .string()
        .trim()
        .regex(BANGLADESHI_PHONE, {
          error: "phone must be a valid Bangladeshi number, e.g. 01712345678",
        })
        .optional(),

      email: z
        .undefined({
          error: "Email cannot be changed. It is the permanent identifier for your account.",
        })
        .optional(),

      role: z.undefined({ error: "Role cannot be changed through this endpoint" }).optional(),

      status: z.undefined({ error: "Account status can only be changed by an admin" }).optional(),
    })
    .strict()
    .refine((body) => body.name !== undefined || body.phone !== undefined, {
      error: "Provide at least one field to update: name or phone",
    }),
});

export const deleteMeSchema = z.object({
  body: z
    .object({
      password: z
        .string()
        .min(1, { error: "password is required to delete your account" })
        .optional(),
    })
    .strict(),
});
