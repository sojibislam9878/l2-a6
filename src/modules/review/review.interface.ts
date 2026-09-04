import type { z } from "zod";
import type { Role } from "../../../generated/prisma/client.js";
import type { createReviewSchema, updateReviewSchema } from "./review.validation.js";

export type ICreateReviewPayload = z.infer<typeof createReviewSchema>["body"];

export type IUpdateReviewPayload = z.infer<typeof updateReviewSchema>["body"];

export type IReviewActor = { id: string; role: Role };

export type IReviewFilters = {
  page?: number | undefined;
  limit?: number | undefined;
  sortOrder?: "asc" | "desc" | undefined;
};

export type IReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  farmer: {
    id: string;
    name: string;
  };
};
