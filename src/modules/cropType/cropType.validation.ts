import { z } from "zod";

const name = z
  .string({ error: "name is required" })
  .trim()
  .min(2, { error: "name must be at least 2 characters" })
  .max(60, { error: "name must be at most 60 characters" });

const temperature = z.coerce
  .number({ error: "temperature must be a number" })
  .min(-40, { error: "temperature must be at least -40C" })
  .max(40, { error: "temperature must be at most 40C" });

const maxStorageDays = z.coerce
  .number({ error: "maxStorageDays must be a number" })
  .int({ error: "maxStorageDays must be a whole number" })
  .positive({ error: "maxStorageDays must be greater than zero" })
  .max(730, { error: "maxStorageDays cannot exceed 730" });

export const listCropTypesSchema = z.object({
  query: z
    .object({
      search: z.string().trim().min(1).optional(),
    })
    .strict(),
});

export const createCropTypeSchema = z.object({
  body: z
    .object({
      name,
      idealMinTempC: temperature,
      idealMaxTempC: temperature,
      maxStorageDays,
    })
    .strict()
    .refine((body) => body.idealMaxTempC >= body.idealMinTempC, {
      error: "idealMaxTempC must be greater than or equal to idealMinTempC",
      path: ["idealMaxTempC"],
    }),
});

export const updateCropTypeSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      name: name.optional(),
      idealMinTempC: temperature.optional(),
      idealMaxTempC: temperature.optional(),
      maxStorageDays: maxStorageDays.optional(),
    })
    .strict()
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      error: "Provide at least one field to update",
    }),
});

export const cropTypeIdSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
});
