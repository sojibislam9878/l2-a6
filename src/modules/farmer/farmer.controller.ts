import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  ICreateFarmerProfilePayload,
  IUpdateFarmerProfilePayload,
} from "./farmer.interface.js";
import { farmerService } from "./farmer.service.js";

const createFarmerProfile = catchAsync(async (req, res) => {
  const current = req.user!;
  const profile = await farmerService.createFarmerProfileDb(
    current.id,
    current.role,
    req.body as ICreateFarmerProfilePayload,
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Farming profile created successfully",
    data: profile,
  });
});

const getFarmerProfile = catchAsync(async (req, res) => {
  const current = req.user!;
  const profile = await farmerService.getFarmerProfileFromDb(current.id, current.role);

  sendResponse(res, {
    statusCode: 200,
    message: "Farming profile retrieved successfully",
    data: profile,
  });
});

const updateFarmerProfile = catchAsync(async (req, res) => {
  const current = req.user!;
  const profile = await farmerService.updateFarmerProfileDb(
    current.id,
    current.role,
    req.body as IUpdateFarmerProfilePayload,
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Farming profile updated successfully",
    data: profile,
  });
});

export const farmerController = {
  createFarmerProfile,
  getFarmerProfile,
  updateFarmerProfile,
};
