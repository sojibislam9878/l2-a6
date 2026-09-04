import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { IUpdateWarehouseStatusPayload } from "./admin.interface.js";
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

export const adminController = {
  updateWarehouseStatus,
};
