import { z } from "zod";

export const PAYMENT_STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"] as const;

export const createCheckoutSessionSchema = z.object({
  body: z
    .object({
      bookingId: z.uuid({ error: "bookingId must be a valid uuid" }),
    })
    .strict(),
});

export const listPaymentsSchema = z.object({
  query: z
    .object({
      status: z.enum(PAYMENT_STATUSES).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict(),
});

export const paymentIdSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
});

export const refundPaymentSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      reason: z.string().trim().min(3).max(255).optional(),
    })
    .strict(),
});
