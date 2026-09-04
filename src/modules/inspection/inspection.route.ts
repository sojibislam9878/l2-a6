import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { inspectionController } from "./inspection.controller.js";
import { inspectionIdSchema, listInspectionsSchema } from "./inspection.validation.js";

const router = Router();

router.get(
  "/",
  auth,
  authorize("ADMIN"),
  validateRequest(listInspectionsSchema),
  inspectionController.getInspections,
);

router.get(
  "/:id",
  auth,
  validateRequest(inspectionIdSchema),
  inspectionController.getInspectionById,
);

export const inspectionRoute = router;
