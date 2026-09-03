import type { CookieOptions, Response } from "express";
import { isProduction } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { ILoginPayload, ISignupPayload } from "./auth.interface.js";
import { authService } from "./auth.service.js";

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/api/v1/auth",
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
};

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions);
};

const signup = catchAsync(async (req, res) => {
  const user = await authService.registerUserDb(req.body as ISignupPayload);

  const message =
    user.role === "WAREHOUSE_OWNER"
      ? "Account created successfully. Complete your warehouse owner profile before you can list warehouses."
      : "Account created successfully";

  sendResponse(res, { statusCode: 201, message, data: user });
});

const login = catchAsync(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.loginUserDb(
    req.body as ILoginPayload,
  );

  setRefreshCookie(res, refreshToken);

  sendResponse(res, {
    statusCode: 200,
    message: "Logged in successfully",
    data: { accessToken, user },
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const fromCookie = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  const token = fromCookie ?? fromBody;

  if (token === undefined || token.length === 0) {
    throw new AppError(401, "No refresh token provided, please log in again");
  }

  const result = await authService.refreshTokensDb(token);

  setRefreshCookie(res, result.refreshToken);

  sendResponse(res, {
    statusCode: 200,
    message: "Token refreshed successfully",
    data: { accessToken: result.accessToken, user: result.user },
  });
});

export const authController = {
  signup,
  login,
  refreshToken,
};
