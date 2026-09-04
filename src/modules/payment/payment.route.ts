import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { paymentController } from "./payment.controller.js";
import {
  createCheckoutSessionSchema,
  listPaymentsSchema,
  paymentIdSchema,
  refundPaymentSchema,
} from "./payment.validation.js";

const router = Router();

router.get("/success", paymentController.paymentSuccess);
router.get("/cancel", paymentController.paymentCancel);

router.post(
  "/checkout-session",
  auth,
  authorize("FARMER"),
  validateRequest(createCheckoutSessionSchema),
  paymentController.createCheckoutSession,
);

router.get(
  "/me",
  auth,
  authorize("FARMER"),
  validateRequest(listPaymentsSchema),
  paymentController.getMyPayments,
);

router.get("/:id", auth, validateRequest(paymentIdSchema), paymentController.getPaymentById);

router.post(
  "/:id/refund",
  auth,
  authorize("ADMIN"),
  validateRequest(refundPaymentSchema),
  paymentController.refundPayment,
);

export const paymentRoute = router;
