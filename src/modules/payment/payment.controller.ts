import { validatedQuery } from "../../middlewares/validateRequest.js";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  ICreateCheckoutSessionPayload,
  IPaymentFilters,
  IRefundPaymentPayload,
} from "./payment.interface.js";
import { paymentService } from "./payment.service.js";

const createCheckoutSession = catchAsync(async (req, res) => {
  const { bookingId } = req.body as ICreateCheckoutSessionPayload;
  const data = await paymentService.createCheckoutSessionDb(req.user!.id, bookingId);

  sendResponse(res, {
    statusCode: 201,
    message: "Checkout session created. Open checkoutUrl to pay.",
    data,
  });
});

const handleWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const event = paymentService.constructWebhookEvent(
    req.body as Buffer,
    typeof signature === "string" ? signature : undefined,
  );

  const outcome = await paymentService.handleWebhookEvent(event);

  res.status(200).json({ received: true, type: event.type, outcome });
});

const paymentSuccess = catchAsync(async (req, res) => {
  const sessionId = req.query.session_id;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new AppError(400, "session_id is required");
  }

  const data = await paymentService.getPaymentStatusBySessionId(sessionId);

  const message =
    data.status === "SUCCEEDED"
      ? "Payment confirmed. Your lot is booked."
      : "Payment received by Stripe. Waiting for confirmation, refresh in a moment.";

  sendResponse(res, { statusCode: 200, message, data });
});

const paymentCancel = catchAsync(async (_req, res) => {
  sendResponse(res, {
    statusCode: 200,
    message: "Payment cancelled. The booking is still held until the hold expires.",
  });
});

const getMyPayments = catchAsync(async (req, res) => {
  const filters = validatedQuery<IPaymentFilters>(res);
  const { data, meta } = await paymentService.getMyPaymentsFromDb(req.user!.id, filters);

  sendResponse(res, { statusCode: 200, message: "Payments retrieved successfully", data, meta });
});

const getPaymentById = catchAsync(async (req, res) => {
  const data = await paymentService.getPaymentByIdFromDb(String(req.params.id), {
    id: req.user!.id,
    role: req.user!.role,
  });

  sendResponse(res, { statusCode: 200, message: "Payment retrieved successfully", data });
});

const refundPayment = catchAsync(async (req, res) => {
  const { reason } = req.body as IRefundPaymentPayload;
  const data = await paymentService.refundPaymentDb(
    String(req.params.id),
    req.user!.id,
    reason,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 200,
    message: `Payment refunded. ${data.amountBdt} BDT will return to the farmer.`,
    data,
  });
});

export const paymentController = {
  createCheckoutSession,
  handleWebhook,
  paymentSuccess,
  paymentCancel,
  getMyPayments,
  getPaymentById,
  refundPayment,
};
