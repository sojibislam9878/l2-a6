import { validatedQuery } from "../../middlewares/validateRequest.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { availabilityService } from "./availability.service.js";

type AvailabilityQuery = {
  startDate: Date;
  endDate: Date;
  cropTypeId?: string | undefined;
};

const getWarehouseAvailability = catchAsync(async (req, res) => {
  const query = validatedQuery<AvailabilityQuery>(res);
  const data = await availabilityService.getWarehouseAvailability(String(req.params.id), query);

  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse availability retrieved successfully",
    data,
  });
});

const getChamberAvailability = catchAsync(async (req, res) => {
  const query = validatedQuery<AvailabilityQuery>(res);
  const data = await availabilityService.getChamberAvailability(String(req.params.id), query);

  sendResponse(res, {
    statusCode: 200,
    message: "Chamber availability retrieved successfully",
    data,
  });
});

export const availabilityController = {
  getWarehouseAvailability,
  getChamberAvailability,
};
