import { z } from "zod";

export const updateWarehouseStatusSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"], {
        error: "status must be PENDING, APPROVED, REJECTED or SUSPENDED",
      }),
      reason: z.string().trim().min(3).max(255).optional(),
    })
    .strict(),
});
