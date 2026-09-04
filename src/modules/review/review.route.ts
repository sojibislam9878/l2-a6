import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { cacheResponse, queryOf } from "../../middlewares/cache.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { CACHE_TTL, cacheKeys } from "../../utils/cacheKeys.js";
import { warehouseReviewsSchema } from "../warehouse/warehouse.validation.js";
import { reviewController } from "./review.controller.js";
import { createReviewSchema, reviewIdSchema, updateReviewSchema } from "./review.validation.js";

const nestedRouter = Router({ mergeParams: true });

nestedRouter.get(
  "/",
  validateRequest(warehouseReviewsSchema),
  cacheResponse(CACHE_TTL.warehouseReviews, (req) =>
    cacheKeys.warehouseReviews(String(req.params.warehouseId), queryOf(req)),
  ),
  reviewController.getWarehouseReviews,
);

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
