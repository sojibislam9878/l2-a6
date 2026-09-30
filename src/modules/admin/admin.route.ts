import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { cacheResponse } from "../../middlewares/cache.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { CACHE_TTL, cacheKeys } from "../../utils/cacheKeys.js";
import { bookingController } from "../booking/booking.controller.js";
import { listBookingsSchema } from "../booking/booking.validation.js";
import { inspectionController } from "../inspection/inspection.controller.js";
import { createInspectionSchema } from "../inspection/inspection.validation.js";
import { paymentController } from "../payment/payment.controller.js";
import { listAllPaymentsSchema } from "../payment/payment.validation.js";
import { adminController } from "./admin.controller.js";
import {
  listAdminWarehousesSchema,
  listAuditLogsSchema,
  listUsersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  updateWarehouseStatusSchema,
  userIdSchema,
} from "./admin.validation.js";

const router = Router();

router.use(auth, authorize("ADMIN"));

router.get(
  "/stats",
  cacheResponse(CACHE_TTL.adminStats, () => cacheKeys.adminStats()),
  adminController.getStats,
);
router.get("/bookings", validateRequest(listBookingsSchema), bookingController.getAllBookings);
router.post(
  "/bookings/:id/inspection",
  validateRequest(createInspectionSchema),
  inspectionController.createInspection,
);
router.get("/payments", validateRequest(listAllPaymentsSchema), paymentController.getAllPayments);
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

router.get(
  "/warehouses",
  validateRequest(listAdminWarehousesSchema),
  adminController.getWarehouses,
);
router.patch(
  "/warehouses/:id/status",
  validateRequest(updateWarehouseStatusSchema),
  adminController.updateWarehouseStatus,
);

export const adminRoute = router;
