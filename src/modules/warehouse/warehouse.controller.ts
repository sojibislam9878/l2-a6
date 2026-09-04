import { validatedQuery } from "../../middlewares/validateRequest.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  ICreateWarehousePayload,
  IMyWarehouseFilters,
  IUpdateWarehousePayload,
  IWarehouseFilters,
} from "./warehouse.interface.js";
import { warehouseService } from "./warehouse.service.js";

const getWarehouses = catchAsync(async (_req, res) => {
  const filters = validatedQuery<IWarehouseFilters>(res);
  const { data, meta } = await warehouseService.getWarehousesFromDb(filters);

  sendResponse(res, {
    statusCode: 200,
    message: "Warehouses retrieved successfully",
    data,
    meta,
  });
});

const getMyWarehouses = catchAsync(async (req, res) => {
  const filters = validatedQuery<IMyWarehouseFilters>(res);
  const { data, meta } = await warehouseService.getMyWarehousesFromDb(req.user!.id, filters);

  sendResponse(res, {
    statusCode: 200,
    message: "Your warehouses retrieved successfully",
    data,
    meta,
  });
});

const getWarehouseById = catchAsync(async (req, res) => {
  const data = await warehouseService.getWarehouseByIdFromDb(String(req.params.id));

  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse retrieved successfully",
    data,
  });
});

const createWarehouse = catchAsync(async (req, res) => {
  const data = await warehouseService.createWarehouseDb(
    req.user!.id,
    req.body as ICreateWarehousePayload,
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Warehouse created. An admin must approve it before farmers can book.",
    data,
  });
});

const updateWarehouse = catchAsync(async (req, res) => {
  const data = await warehouseService.updateWarehouseDb(
    String(req.params.id),
    req.user!.id,
    req.body as IUpdateWarehousePayload,
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse updated successfully",
    data,
  });
});

const deleteWarehouse = catchAsync(async (req, res) => {
  await warehouseService.softDeleteWarehouseDb(String(req.params.id), req.user!.id);

  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse deleted successfully",
  });
});

export const warehouseController = {
  getWarehouses,
  getMyWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
