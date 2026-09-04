import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { adminController } from "./admin.controller.js";
import { updateWarehouseStatusSchema } from "./admin.validation.js";

const router = Router();

router.use(auth, authorize("ADMIN"));

router.patch(
  "/warehouses/:id/status",
  validateRequest(updateWarehouseStatusSchema),
  adminController.updateWarehouseStatus,
);

export const adminRoute = router;
