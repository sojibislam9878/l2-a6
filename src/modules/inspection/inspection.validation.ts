import { z } from "zod";

export const INSPECTION_GRADES = ["A", "B", "C", "REJECTED"] as const;

export const createInspectionSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      grade: z.enum(INSPECTION_GRADES, {
        error: "grade must be A, B, C or REJECTED",
      }),
      actualQtyKg: z.coerce
        .number({ error: "actualQtyKg must be a number" })
        .int({ error: "actualQtyKg must be a whole number" })
        .positive({ error: "actualQtyKg must be greater than zero" })
        .max(10_000_000, { error: "actualQtyKg is unrealistically large" }),
      moisturePct: z.coerce
        .number({ error: "moisturePct must be a number" })
        .min(0, { error: "moisturePct cannot be negative" })
        .max(100, { error: "moisturePct cannot exceed 100" })
        .optional(),
      notes: z.string().trim().min(3).max(500).optional(),
    })
    .strict(),
});

export const listInspectionsSchema = z.object({
  query: z
    .object({
      grade: z.enum(INSPECTION_GRADES).optional(),
      bookingId: z.uuid({ error: "bookingId must be a valid uuid" }).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict(),
});

export const inspectionIdSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
});
