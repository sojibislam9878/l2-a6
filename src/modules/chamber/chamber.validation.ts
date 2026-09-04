import { z } from "zod";

const name = z
  .string({ error: "name is required" })
  .trim()
  .min(1, { error: "name is required" })
  .max(60, { error: "name must be at most 60 characters" });

const capacityKg = z.coerce
  .number({ error: "capacityKg must be a number" })
  .int({ error: "capacityKg must be a whole number" })
  .positive({ error: "capacityKg must be greater than zero" })
  .max(10_000_000, { error: "capacityKg is unrealistically large" });

const temperature = z.coerce
  .number({ error: "temperature must be a number" })
  .min(-40, { error: "temperature must be at least -40C" })
  .max(40, { error: "temperature must be at most 40C" });

export const listChambersSchema = z.object({
  params: z.object({ warehouseId: z.uuid({ error: "warehouseId must be a valid uuid" }) }),
  query: z
    .object({
      isActive: z.enum(["true", "false"]).optional(),
    })
    .strict(),
});

export const createChamberSchema = z.object({
  params: z.object({ warehouseId: z.uuid({ error: "warehouseId must be a valid uuid" }) }),
  body: z
    .object({
      name,
      capacityKg,
      minTempC: temperature,
      maxTempC: temperature,
    })
    .strict()
    .refine((body) => body.maxTempC >= body.minTempC, {
      error: "maxTempC must be greater than or equal to minTempC",
      path: ["maxTempC"],
    }),
});

export const updateChamberSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      name: name.optional(),
      capacityKg: capacityKg.optional(),
      minTempC: temperature.optional(),
      maxTempC: temperature.optional(),
      isActive: z.boolean().optional(),
    })
    .strict()
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      error: "Provide at least one field to update",
    }),
});

export const chamberIdSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
});
