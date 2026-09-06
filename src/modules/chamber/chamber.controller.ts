import { validatedQuery } from "../../middlewares/validateRequest.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  IChamberFilters,
  ICreateChamberPayload,
  IUpdateChamberPayload,
} from "./chamber.interface.js";
import { chamberService } from "./chamber.service.js";

const getChambers = catchAsync(async (req, res) => {
  const filters = validatedQuery<IChamberFilters>(res);
  const { data, meta } = await chamberService.getChambersFromDb(
    String(req.params.warehouseId),
    filters,
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Chambers retrieved successfully",
    data,
    meta,
  });
});

const getChamberById = catchAsync(async (req, res) => {
  const data = await chamberService.getChamberByIdFromDb(String(req.params.id));

  sendResponse(res, {
    statusCode: 200,
    message: "Chamber retrieved successfully",
    data,
  });
});

const createChamber = catchAsync(async (req, res) => {
  const data = await chamberService.createChamberDb(
    String(req.params.warehouseId),
    req.user!.id,
    req.body as ICreateChamberPayload,
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Chamber created successfully",
    data,
  });
});

const updateChamber = catchAsync(async (req, res) => {
  const data = await chamberService.updateChamberDb(
    String(req.params.id),
    req.user!.id,
    req.body as IUpdateChamberPayload,
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Chamber updated successfully",
    data,
  });
});

const deleteChamber = catchAsync(async (req, res) => {
  await chamberService.softDeleteChamberDb(String(req.params.id), req.user!.id);

  sendResponse(res, {
    statusCode: 200,
    message: "Chamber deleted successfully",
  });
});

export const chamberController = {
  getChambers,
  getChamberById,
  createChamber,
  updateChamber,
  deleteChamber,
};
