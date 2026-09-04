import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { adminController } from "./admin.controller.js";
import {
  listAuditLogsSchema,
  listUsersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  updateWarehouseStatusSchema,
  userIdSchema,
} from "./admin.validation.js";

const router = Router();

router.use(auth, authorize("ADMIN"));

router.get("/stats", adminController.getStats);
router.get("/audit-logs", validateRequest(listAuditLogsSchema), adminController.getAuditLogs);

router.get("/users", validateRequest(listUsersSchema), adminController.getUsers);
router.get("/users/:id", validateRequest(userIdSchema), adminController.getUserById);
router.patch(
  "/users/:id/status",
  validateRequest(updateUserStatusSchema),
  adminController.updateUserStatus,
);
router.patch(
  "/users/:id/role",
  validateRequest(updateUserRoleSchema),
  adminController.updateUserRole,
);

router.patch(
  "/warehouses/:id/status",
  validateRequest(updateWarehouseStatusSchema),
  adminController.updateWarehouseStatus,
);

export const adminRoute = router;
