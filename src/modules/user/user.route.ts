import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { ownerProfileController } from "./ownerProfile.controller.js";
import {
  createOwnerProfileSchema,
  updateOwnerProfileSchema,
} from "./ownerProfile.validation.js";
import { userController } from "./user.controller.js";
import { updateMeSchema } from "./user.validation.js";

const router = Router();

router.get("/me", auth, userController.getMe);
router.patch("/me", auth, validateRequest(updateMeSchema), userController.updateMe);

router.post(
  "/me/owner-profile",
  auth,
  validateRequest(createOwnerProfileSchema),
  ownerProfileController.createOwnerProfile,
);
router.get("/me/owner-profile", auth, ownerProfileController.getOwnerProfile);
router.patch(
  "/me/owner-profile",
  auth,
  validateRequest(updateOwnerProfileSchema),
  ownerProfileController.updateOwnerProfile,
);

export const userRoute = router;
