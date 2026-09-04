import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authLimiter, otpLimiter } from "../../middlewares/rateLimiter.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { authController } from "./auth.controller.js";
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resendOtpSchema,
  setPasswordSchema,
  signupSchema,
  verifyOtpSchema,
} from "./auth.validation.js";

const router = Router();

router.post("/signup", authLimiter, validateRequest(signupSchema), authController.signup);
router.post("/verify-otp", otpLimiter, validateRequest(verifyOtpSchema), authController.verifyOtp);
router.post("/resend-otp", otpLimiter, validateRequest(resendOtpSchema), authController.resendOtp);
router.post("/login", authLimiter, validateRequest(loginSchema), authController.login);
router.post("/refresh-token", validateRequest(refreshTokenSchema), authController.refreshToken);
router.post("/logout", validateRequest(refreshTokenSchema), authController.logout);
router.post("/set-password", auth, validateRequest(setPasswordSchema), authController.setPassword);
router.post(
  "/change-password",
  auth,
  validateRequest(changePasswordSchema),
  authController.changePassword,
);
router.get("/google", authController.googleRedirect);
router.get("/google/callback", authController.googleCallback);

export const authRoute = router;
