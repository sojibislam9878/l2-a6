import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { warehouseReviewsSchema } from "../warehouse/warehouse.validation.js";
import { reviewController } from "./review.controller.js";
import { createReviewSchema, reviewIdSchema, updateReviewSchema } from "./review.validation.js";

const nestedRouter = Router({ mergeParams: true });

nestedRouter.get("/", validateRequest(warehouseReviewsSchema), reviewController.getWarehouseReviews);

const router = Router();

router.post(
  "/",
  auth,
  authorize("FARMER"),
  validateRequest(createReviewSchema),
  reviewController.createReview,
);

router.patch(
  "/:id",
  auth,
  authorize("FARMER"),
  validateRequest(updateReviewSchema),
  reviewController.updateReview,
);

router.delete(
  "/:id",
  auth,
  authorize("FARMER", "ADMIN"),
  validateRequest(reviewIdSchema),
  reviewController.deleteReview,
);

export const warehouseReviewRoute = nestedRouter;
export const reviewRoute = router;
