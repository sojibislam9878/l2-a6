import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { requireCompleteProfile } from "../../middlewares/requireCompleteProfile.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { warehouseController } from "./warehouse.controller.js";
import {
  createWarehouseSchema,
  listMyWarehousesSchema,
  listWarehousesSchema,
  updateWarehouseSchema,
  warehouseIdSchema,
} from "./warehouse.validation.js";

const router = Router();

router.get("/", validateRequest(listWarehousesSchema), warehouseController.getWarehouses);

router.get(
  "/me",
  auth,
  authorize("WAREHOUSE_OWNER"),
  validateRequest(listMyWarehousesSchema),
  warehouseController.getMyWarehouses,
);

router.post(
  "/",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(createWarehouseSchema),
  warehouseController.createWarehouse,
);

router.get("/:id", validateRequest(warehouseIdSchema), warehouseController.getWarehouseById);

router.patch(
  "/:id",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(updateWarehouseSchema),
  warehouseController.updateWarehouse,
);

router.delete(
  "/:id",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(warehouseIdSchema),
  warehouseController.deleteWarehouse,
);

export const warehouseRoute = router;
