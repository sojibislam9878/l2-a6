import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { userController } from "./user.controller.js";
import { updateMeSchema } from "./user.validation.js";

const router = Router();

router.get("/me", auth, userController.getMe);
router.patch("/me", auth, validateRequest(updateMeSchema), userController.updateMe);

export const userRoute = router;
