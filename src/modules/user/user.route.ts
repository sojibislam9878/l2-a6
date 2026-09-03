import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { userController } from "./user.controller.js";
import { deleteMeSchema, updateMeSchema } from "./user.validation.js";

const router = Router();

router.get("/me", auth, userController.getMe);
router.patch("/me", auth, validateRequest(updateMeSchema), userController.updateMe);
router.delete("/me", auth, validateRequest(deleteMeSchema), userController.deleteMe);
router.get("/me/dashboard", auth, userController.getDashboard);

export const userRoute = router;
