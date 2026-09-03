import type { CookieOptions, Response } from "express";
import { env, isProduction } from "../../config/env.js";
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

const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body as { email: string; otp: string };
  const user = await authService.verifyEmailOtpDb(email, otp);

  sendResponse(res, {
    statusCode: 200,
    message: "Email verified successfully. You can now log in.",
    data: user,
  });
});

const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body as { email: string };
  await authService.resendEmailOtpDb(email);

  sendResponse(res, {
    statusCode: 200,
    message: "If that account exists and is unverified, a new code has been sent.",
  });
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

const logout = catchAsync(async (req, res) => {
  const fromCookie = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;

  await authService.logoutDb(fromCookie ?? fromBody);

  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });

  sendResponse(res, { statusCode: 200, message: "Logged out successfully" });
});

const googleRedirect = catchAsync(async (req, res) => {
  const mode = req.query.mode === "json" ? "json" : "redirect";
  const url = await authService.createGoogleAuthUrl(mode);
  res.redirect(url);
});

const googleCallback = catchAsync(async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const denied = typeof req.query.error === "string" ? req.query.error : "";

  const mode = state.length > 0 ? await authService.consumeGoogleState(state) : "redirect";

  const fail = (status: number, message: string): void => {
    if (mode === "json") {
      res.status(status).json({ success: false, message, errors: [] });
      return;
    }
    res.redirect(`${env.FRONTEND_URL}/?error=${encodeURIComponent(message)}`);
  };

  if (denied.length > 0) {
    fail(401, `Google sign-in was cancelled (${denied})`);
    return;
  }

  if (code.length === 0) {
    fail(400, "Google did not return an authorization code");
    return;
  }

  let result: Awaited<ReturnType<typeof authService.googleAuthDb>>;

  try {
    result = await authService.googleAuthDb(code);
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Google sign-in failed";
    fail(status, message);
    return;
  }

  setRefreshCookie(res, result.refreshToken);

  if (mode === "json") {
    sendResponse(res, {
      statusCode: 200,
      message: "Signed in with Google successfully",
      data: { accessToken: result.accessToken, user: result.user },
    });
    return;
  }

  const params = new URLSearchParams({
    accessToken: result.accessToken,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
  });

  res.redirect(`${env.FRONTEND_URL}/?${params.toString()}`);
});

const setPassword = catchAsync(async (req, res) => {
  const { newPassword } = req.body as { newPassword: string };
  await authService.setPasswordDb(req.user!.id, newPassword);

  sendResponse(res, {
    statusCode: 200,
    message: 'Password set successfully. You can now log in with your email and password too.',
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };
  await authService.changePasswordDb(req.user!.id, currentPassword, newPassword);

  sendResponse(res, { statusCode: 200, message: 'Password changed successfully' });
});

export const authController = {
  verifyOtp,
  resendOtp,
  signup,
  login,
  refreshToken,
  logout,
  setPassword,
  changePassword,
  googleRedirect,
  googleCallback,
};
