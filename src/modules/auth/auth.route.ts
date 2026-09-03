import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { authController } from "./auth.controller.js";
import { loginSchema, refreshTokenSchema, signupSchema } from "./auth.validation.js";

const router = Router();

router.post("/signup", validateRequest(signupSchema), authController.signup);
router.post("/login", validateRequest(loginSchema), authController.login);
router.post("/refresh-token", validateRequest(refreshTokenSchema), authController.refreshToken);

export const authRoute = router;
