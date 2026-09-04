import { validatedQuery } from "../../middlewares/validateRequest.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { IReviewFilters } from "./review.interface.js";
import { reviewService } from "./review.service.js";

const getWarehouseReviews = catchAsync(async (req, res) => {
  const filters = validatedQuery<IReviewFilters>(res);
  const { data, meta } = await reviewService.getWarehouseReviewsFromDb(
    String(req.params.warehouseId),
    filters,
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Reviews retrieved successfully",
    data,
    meta,
  });
});

export const reviewController = {
  getWarehouseReviews,
};
