import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { ISignupPayload } from "./auth.interface.js";
import { authService } from "./auth.service.js";

const signup = catchAsync(async (req, res) => {
  const user = await authService.registerUserDb(req.body as ISignupPayload);

  const message =
    user.role === "WAREHOUSE_OWNER"
      ? "Account created successfully. Complete your warehouse owner profile before you can list warehouses."
      : "Account created successfully";

  sendResponse(res, {
    statusCode: 201,
    message,
    data: user,
  });
});

export const authController = {
  signup,
};
