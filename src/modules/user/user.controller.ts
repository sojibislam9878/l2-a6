import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { IUpdateMePayload } from "./user.interface.js";
import { userService } from "./user.service.js";

const getMe = catchAsync(async (req, res) => {
  const user = await userService.getMeFromDb(req.user!.id);

  sendResponse(res, {
    statusCode: 200,
    message: "Profile retrieved successfully",
    data: user,
  });
});

const updateMe = catchAsync(async (req, res) => {
  const user = await userService.updateMeDb(req.user!.id, req.body as IUpdateMePayload);

  sendResponse(res, {
    statusCode: 200,
    message: "Profile updated successfully",
    data: user,
  });
});

export const userController = {
  getMe,
  updateMe,
};
