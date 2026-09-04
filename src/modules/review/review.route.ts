import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { warehouseReviewsSchema } from "../warehouse/warehouse.validation.js";
import { reviewController } from "./review.controller.js";

const nestedRouter = Router({ mergeParams: true });

nestedRouter.get(
  "/",
  validateRequest(warehouseReviewsSchema),
  reviewController.getWarehouseReviews,
);

export const warehouseReviewRoute = nestedRouter;
