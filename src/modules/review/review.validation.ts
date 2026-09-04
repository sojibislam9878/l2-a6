import { z } from "zod";

const rating = z.coerce
  .number({ error: "rating must be a number" })
  .int({ error: "rating must be a whole number" })
  .min(1, { error: "rating must be between 1 and 5" })
  .max(5, { error: "rating must be between 1 and 5" });

const comment = z
  .string()
  .trim()
  .min(3, { error: "comment must be at least 3 characters" })
  .max(1000, { error: "comment must be at most 1000 characters" });

export const createReviewSchema = z.object({
  body: z
    .object({
      bookingId: z.uuid({ error: "bookingId must be a valid uuid" }),
      rating,
      comment: comment.optional(),
    })
    .strict(),
});

export const updateReviewSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      rating: rating.optional(),
      comment: comment.optional(),
    })
    .strict()
    .refine((body) => body.rating !== undefined || body.comment !== undefined, {
      error: "Provide at least one field to update: rating or comment",
    }),
});

export const reviewIdSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
});
