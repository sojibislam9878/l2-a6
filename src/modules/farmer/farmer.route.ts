import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { farmerController } from "./farmer.controller.js";
import { createFarmerProfileSchema, updateFarmerProfileSchema } from "./farmer.validation.js";

const router = Router();

router.post("/", auth, validateRequest(createFarmerProfileSchema), farmerController.createFarmerProfile);
router.get("/", auth, farmerController.getFarmerProfile);
router.patch("/", auth, validateRequest(updateFarmerProfileSchema), farmerController.updateFarmerProfile);

export const farmerRoute = router;
