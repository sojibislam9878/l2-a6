import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  ICreateOwnerProfilePayload,
  IUpdateOwnerProfilePayload,
} from "./ownerProfile.interface.js";
import { ownerProfileService } from "./ownerProfile.service.js";

const createOwnerProfile = catchAsync(async (req, res) => {
  const current = req.user!;
  const profile = await ownerProfileService.createOwnerProfileDb(
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
  const profile = await ownerProfileService.getOwnerProfileFromDb(current.id, current.role);

  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse owner profile retrieved successfully",
    data: profile,
  });
});

const updateOwnerProfile = catchAsync(async (req, res) => {
  const current = req.user!;
  const profile = await ownerProfileService.updateOwnerProfileDb(
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

export const ownerProfileController = {
  createOwnerProfile,
  getOwnerProfile,
  updateOwnerProfile,
};
