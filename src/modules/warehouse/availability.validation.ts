import { z } from "zod";

const isoDate = z
  .string({ error: "date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "date must be in YYYY-MM-DD format" })
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => !Number.isNaN(date.getTime()), { error: "date is not a real calendar date" });

const window = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    cropTypeId: z.uuid({ error: "cropTypeId must be a valid uuid" }).optional(),
  })
  .strict()
  .refine((query) => query.endDate.getTime() >= query.startDate.getTime(), {
    error: "endDate must be on or after startDate",
    path: ["endDate"],
  })
  .refine(
    (query) =>
      (query.endDate.getTime() - query.startDate.getTime()) / (24 * 60 * 60 * 1000) <= 365,
    { error: "the availability window cannot exceed 365 days", path: ["endDate"] },
  );

export const warehouseAvailabilitySchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  query: window,
});

export const chamberAvailabilitySchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  query: window,
});
