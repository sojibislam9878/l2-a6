import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { ownerController } from "./owner.controller.js";
import { createOwnerProfileSchema, updateOwnerProfileSchema } from "./owner.validation.js";

const router = Router();

router.post("/", auth, validateRequest(createOwnerProfileSchema), ownerController.createOwnerProfile);
router.get("/", auth, ownerController.getOwnerProfile);
router.patch("/", auth, validateRequest(updateOwnerProfileSchema), ownerController.updateOwnerProfile);

export const ownerRoute = router;
