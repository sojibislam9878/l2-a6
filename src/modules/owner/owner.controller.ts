import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  ICreateOwnerProfilePayload,
  IUpdateOwnerProfilePayload,
} from "./owner.interface.js";
import { ownerService } from "./owner.service.js";

const createOwnerProfile = catchAsync(async (req, res) => {
  const current = req.user!;
  const profile = await ownerService.createOwnerProfileDb(
    current.id,
    current.role,
    req.body as ICreateOwnerProfilePayload,
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Warehouse owner profile created. You can now list warehouses.",
    data: profile,
  });
});

const getOwnerProfile = catchAsync(async (req, res) => {
  const current = req.user!;
  const profile = await ownerService.getOwnerProfileFromDb(current.id, current.role);

  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse owner profile retrieved successfully",
    data: profile,
  });
});

const updateOwnerProfile = catchAsync(async (req, res) => {
  const current = req.user!;
  const profile = await ownerService.updateOwnerProfileDb(
    current.id,
    current.role,
    req.body as IUpdateOwnerProfilePayload,
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse owner profile updated successfully",
    data: profile,
  });
});

export const ownerController = {
  createOwnerProfile,
  getOwnerProfile,
  updateOwnerProfile,
};
