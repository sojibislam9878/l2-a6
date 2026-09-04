import { validatedQuery } from "../../middlewares/validateRequest.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  IAuditLogFilters,
  IUpdateUserRolePayload,
  IUpdateUserStatusPayload,
  IUpdateWarehouseStatusPayload,
  IUserFilters,
} from "./admin.interface.js";
import { adminService } from "./admin.service.js";

const updateWarehouseStatus = catchAsync(async (req, res) => {
  const data = await adminService.updateWarehouseStatusDb(
    String(req.params.id),
    req.user!.id,
    req.body as IUpdateWarehouseStatusPayload,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 200,
    message: `Warehouse status changed to ${data.status}`,
    data,
  });
});

const getUsers = catchAsync(async (_req, res) => {
  const filters = validatedQuery<IUserFilters>(res);
  const { data, meta } = await adminService.getUsersFromDb(filters);

  sendResponse(res, {
    statusCode: 200,
    message: "Users retrieved successfully",
    data,
    meta,
  });
});

const getUserById = catchAsync(async (req, res) => {
  const data = await adminService.getUserByIdFromDb(String(req.params.id));

  sendResponse(res, {
    statusCode: 200,
    message: "User retrieved successfully",
    data,
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const data = await adminService.updateUserStatusDb(
    String(req.params.id),
    req.user!.id,
    req.body as IUpdateUserStatusPayload,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 200,
    message: `Account is now ${data.status}`,
    data,
  });
});

const updateUserRole = catchAsync(async (req, res) => {
  const data = await adminService.updateUserRoleDb(
    String(req.params.id),
    req.user!.id,
    req.body as IUpdateUserRolePayload,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 200,
    message: `Role changed to ${data.role}`,
    data,
  });
});

const getAuditLogs = catchAsync(async (_req, res) => {
  const filters = validatedQuery<IAuditLogFilters>(res);
  const { data, meta } = await adminService.getAuditLogsFromDb(filters);

  sendResponse(res, {
    statusCode: 200,
    message: "Audit logs retrieved successfully",
    data,
    meta,
  });
});

const getStats = catchAsync(async (_req, res) => {
  const data = await adminService.getPlatformStatsFromDb();

  sendResponse(res, {
    statusCode: 200,
    message: "Platform statistics retrieved successfully",
    data,
  });
});

export const adminController = {
  updateWarehouseStatus,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getAuditLogs,
  getStats,
};
