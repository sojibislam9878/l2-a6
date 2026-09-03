import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { authController } from "./auth.controller.js";
import { signupSchema } from "./auth.validation.js";

const router = Router();

router.post("/signup", validateRequest(signupSchema), authController.signup);

export const authRoute = router;
