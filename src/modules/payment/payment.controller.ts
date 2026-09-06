import type { Request, Response } from "express";
import { validatedQuery } from "../../middlewares/validateRequest.js";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { type PaymentOutcome, renderPaymentPage } from "../../utils/paymentPage.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  ICreateCheckoutSessionPayload,
  IPayment,
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

const OUTCOME_BY_STATUS: Record<string, PaymentOutcome> = {
  SUCCEEDED: "success",
  PENDING: "processing",
  FAILED: "failed",
  REFUNDED: "refunded",
};

const OUTCOME_MESSAGE: Record<PaymentOutcome, string> = {
  success: "Payment confirmed. Your storage lot is booked.",
  processing: "Payment received by Stripe. Waiting for confirmation, refresh in a moment.",
  failed: "Payment failed. Your booking is unchanged, you can try again.",
  cancelled: "Payment cancelled. The booking is still held until its payment window expires.",
  refunded: "This payment has been refunded.",
};

const respond = (
  req: Request,
  res: Response,
  outcome: PaymentOutcome,
  data: IPayment | null,
): void => {
  const message = OUTCOME_MESSAGE[outcome];
  const format = typeof req.query.format === "string" ? req.query.format : "";
  const acceptsHtml = (req.headers.accept ?? "").includes("text/html");
  const wantsHtml = format === "html" || (format !== "json" && acceptsHtml);

  if (!wantsHtml) {
    sendResponse(res, {
      statusCode: 200,
      message,
      ...(data === null ? {} : { data }),
    });
    return;
  }

  const details =
    data === null
      ? []
      : [
          { label: "Lot", value: data.lotCode },
          { label: "Amount", value: `${data.amountBdt} BDT` },
          { label: "Charged", value: `${data.amount} ${data.currency.toUpperCase()}` },
          { label: "Status", value: data.status },
        ];

  res.status(200).type("html").send(renderPaymentPage(outcome, details));
};

const paymentSuccess = catchAsync(async (req, res) => {
  const sessionId = req.query.session_id;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new AppError(400, "session_id is required");
  }

  const data = await paymentService.getPaymentStatusBySessionId(sessionId);
  const outcome = OUTCOME_BY_STATUS[data.status] ?? "processing";

  respond(req, res, outcome, data);
});

const paymentFailed = catchAsync(async (req, res) => {
  const sessionId = req.query.session_id;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    respond(req, res, "failed", null);
    return;
  }

  const data = await paymentService.getPaymentStatusBySessionId(sessionId);

  respond(req, res, "failed", data);
});

const paymentCancel = catchAsync(async (req, res) => {
  const sessionId = req.query.session_id;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    respond(req, res, "cancelled", null);
    return;
  }

  const data = await paymentService.getPaymentStatusBySessionId(sessionId);

  respond(req, res, "cancelled", data);
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
  paymentFailed,
  getMyPayments,
  getPaymentById,
  refundPayment,
};
