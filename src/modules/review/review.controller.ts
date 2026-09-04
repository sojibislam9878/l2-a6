import { validatedQuery } from "../../middlewares/validateRequest.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  ICreateReviewPayload,
  IReviewFilters,
  IUpdateReviewPayload,
} from "./review.interface.js";
import { reviewService } from "./review.service.js";

const getWarehouseReviews = catchAsync(async (req, res) => {
  const filters = validatedQuery<IReviewFilters>(res);
  const { data, meta } = await reviewService.getWarehouseReviewsFromDb(
    String(req.params.warehouseId),
    filters,
  );

  sendResponse(res, { statusCode: 200, message: "Reviews retrieved successfully", data, meta });
});

const createReview = catchAsync(async (req, res) => {
  const data = await reviewService.createReviewDb(
    req.user!.id,
    req.body as ICreateReviewPayload,
    req.ip,
  );

  sendResponse(res, { statusCode: 201, message: "Review submitted successfully", data });
});

const updateReview = catchAsync(async (req, res) => {
  const data = await reviewService.updateReviewDb(
    String(req.params.id),
    { id: req.user!.id, role: req.user!.role },
    req.body as IUpdateReviewPayload,
    req.ip,
  );

  sendResponse(res, { statusCode: 200, message: "Review updated successfully", data });
});

const deleteReview = catchAsync(async (req, res) => {
  await reviewService.softDeleteReviewDb(
    String(req.params.id),
    { id: req.user!.id, role: req.user!.role },
    req.ip,
  );

  sendResponse(res, { statusCode: 200, message: "Review deleted successfully" });
});

export const reviewController = {
  getWarehouseReviews,
  createReview,
  updateReview,
  deleteReview,
};
