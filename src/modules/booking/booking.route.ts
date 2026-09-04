import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { bookingLimiter } from "../../middlewares/rateLimiter.js";
import { requireCompleteProfile } from "../../middlewares/requireCompleteProfile.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { bookingController } from "./booking.controller.js";
import {
  bookingIdSchema,
  bookingReasonSchema,
  createBookingSchema,
  listBookingsSchema,
} from "./booking.validation.js";

const router = Router();

router.post(
  "/",
  auth,
  authorize("FARMER"),
  bookingLimiter,
  validateRequest(createBookingSchema),
  bookingController.createBooking,
);

router.get(
  "/me",
  auth,
  authorize("FARMER"),
  validateRequest(listBookingsSchema),
  bookingController.getMyBookings,
);

router.get("/:id", auth, validateRequest(bookingIdSchema), bookingController.getBookingById);

router.get(
  "/:id/invoice",
  auth,
  validateRequest(bookingIdSchema),
  bookingController.getBookingInvoice,
);

router.patch(
  "/:id/approve",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(bookingIdSchema),
  bookingController.approveBooking,
);

router.patch(
  "/:id/reject",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(bookingReasonSchema),
  bookingController.rejectBooking,
);

router.patch(
  "/:id/cancel",
  auth,
  authorize("FARMER"),
  validateRequest(bookingReasonSchema),
  bookingController.cancelBooking,
);

router.patch(
  "/:id/store",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(bookingIdSchema),
  bookingController.storeBooking,
);

router.patch(
  "/:id/withdraw-request",
  auth,
  authorize("FARMER"),
  validateRequest(bookingIdSchema),
  bookingController.requestWithdrawal,
);

router.patch(
  "/:id/complete",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(bookingIdSchema),
  bookingController.completeBooking,
);

export const bookingRoute = router;
