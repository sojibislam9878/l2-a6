import { z } from "zod";

export const BOOKING_SORT_FIELDS = ["createdAt", "startDate", "endDate", "quantityKg"] as const;

export const BOOKING_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "PAID",
  "STORED",
  "WITHDRAW_REQUESTED",
  "COMPLETED",
  "EXPIRED",
] as const;

const isoDate = z
  .string({ error: "date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "date must be in YYYY-MM-DD format" })
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => !Number.isNaN(date.getTime()), { error: "date is not a real calendar date" });

const reason = z
  .string()
  .trim()
  .min(3, { error: "reason must be at least 3 characters" })
  .max(255, { error: "reason must be at most 255 characters" });

export const createBookingSchema = z.object({
  body: z
    .object({
      chamberId: z.uuid({ error: "chamberId must be a valid uuid" }),
      cropTypeId: z.uuid({ error: "cropTypeId must be a valid uuid" }),
      quantityKg: z.coerce
        .number({ error: "quantityKg must be a number" })
        .int({ error: "quantityKg must be a whole number" })
        .positive({ error: "quantityKg must be greater than zero" })
        .max(10_000_000, { error: "quantityKg is unrealistically large" }),
      startDate: isoDate,
      endDate: isoDate,
    })
    .strict()
    .refine((body) => body.endDate.getTime() >= body.startDate.getTime(), {
      error: "endDate must be on or after startDate",
      path: ["endDate"],
    }),
});

export const listBookingsSchema = z.object({
  query: z
    .object({
      status: z.enum(BOOKING_STATUSES).optional(),
      sortBy: z.enum(BOOKING_SORT_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict(),
});

export const warehouseBookingsSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  query: z
    .object({
      status: z.enum(BOOKING_STATUSES).optional(),
      sortBy: z.enum(BOOKING_SORT_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict(),
});

export const bookingIdSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
});

export const bookingReasonSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z.object({ reason: reason.optional() }).strict(),
});
