import { validatedQuery } from "../../middlewares/validateRequest.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  ICreateCropTypePayload,
  ICropTypeFilters,
  IUpdateCropTypePayload,
} from "./cropType.interface.js";
import { cropTypeService } from "./cropType.service.js";

const getCropTypes = catchAsync(async (_req, res) => {
  const filters = validatedQuery<ICropTypeFilters>(res);
  const { data, meta } = await cropTypeService.getCropTypesFromDb(filters);

  sendResponse(res, {
    statusCode: 200,
    message: "Crop types retrieved successfully",
    data,
    meta,
  });
});

const getCropTypeById = catchAsync(async (req, res) => {
  const data = await cropTypeService.getCropTypeByIdFromDb(String(req.params.id));

  sendResponse(res, {
    statusCode: 200,
    message: "Crop type retrieved successfully",
    data,
  });
});

const createCropType = catchAsync(async (req, res) => {
  const data = await cropTypeService.createCropTypeDb(req.body as ICreateCropTypePayload);

  sendResponse(res, {
    statusCode: 201,
    message: "Crop type created successfully",
    data,
  });
});

const updateCropType = catchAsync(async (req, res) => {
  const data = await cropTypeService.updateCropTypeDb(
    String(req.params.id),
    req.body as IUpdateCropTypePayload,
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Crop type updated successfully",
    data,
  });
});

const deleteCropType = catchAsync(async (req, res) => {
  await cropTypeService.softDeleteCropTypeDb(String(req.params.id));

  sendResponse(res, {
    statusCode: 200,
    message: "Crop type deleted successfully",
  });
});

export const cropTypeController = {
  getCropTypes,
  getCropTypeById,
  createCropType,
  updateCropType,
  deleteCropType,
};
