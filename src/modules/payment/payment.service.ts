import type Stripe from "stripe";
import type { Prisma } from "../../../generated/prisma/client.js";
import { env, isStripeWebhookConfigured } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import { AppError } from "../../utils/AppError.js";
import { writeAuditLog } from "../../utils/auditLogger.js";
import { buildMeta, buildPagination, type PaginationMeta } from "../../utils/paginate.js";
import type {
  ICheckoutSession,
  IPayment,
  IPaymentActor,
  IPaymentFilters,
} from "./payment.interface.js";

const STRIPE_MINIMUM_USD_CENTS = 50;

const paymentSelect = {
  id: true,
  bookingId: true,
  amount: true,
  currency: true,
  amountBdt: true,
  fxRate: true,
  provider: true,
  status: true,
  paidAt: true,
  refundedAt: true,
  createdAt: true,
  farmerId: true,
  stripePaymentIntentId: true,
  booking: { select: { lotCode: true } },
} as const;

type RawPayment = {
  id: string;
  bookingId: string;
  amount: unknown;
  currency: string;
  amountBdt: unknown;
  fxRate: unknown;
  provider: string;
  status: IPayment["status"];
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  farmerId: string;
  stripePaymentIntentId: string | null;
  booking: { lotCode: string };
};

const toPayment = (row: RawPayment): IPayment => ({
  id: row.id,
  bookingId: row.bookingId,
  lotCode: row.booking.lotCode,
  amount: Number(row.amount),
  currency: row.currency,
  amountBdt: Number(row.amountBdt),
  fxRate: Number(row.fxRate),
  provider: row.provider,
  status: row.status,
  paidAt: row.paidAt,
  refundedAt: row.refundedAt,
  createdAt: row.createdAt,
});

const toUsdCents = (amountBdt: number): number => Math.round(amountBdt * env.DEMO_FX_RATE * 100);

const createCheckoutSessionDb = async (
  farmerId: string,
  bookingId: string,
): Promise<ICheckoutSession> => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: {
      id: true,
      lotCode: true,
      status: true,
      farmerId: true,
      quantityKg: true,
      estimatedCost: true,
      holdExpiresAt: true,
      cropType: { select: { name: true } },
      chamber: { select: { name: true, warehouse: { select: { name: true } } } },
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  if (booking.farmerId !== farmerId) {
    throw new AppError(403, "You can only pay for your own bookings");
  }

  if (booking.status !== "APPROVED") {
    throw new AppError(
      409,
      `Only an APPROVED booking can be paid for. This one is ${booking.status}.`,
    );
  }

  if (booking.holdExpiresAt !== null && booking.holdExpiresAt.getTime() < Date.now()) {
    throw new AppError(409, "The payment hold on this booking has expired. Ask for re-approval.");
  }

  const existing = await prisma.payment.findUnique({
    where: { bookingId },
    select: { id: true, status: true },
  });

  if (existing?.status === "SUCCEEDED") {
    throw new AppError(409, "This booking has already been paid for");
  }

  const amountBdt = Number(booking.estimatedCost);
  const usdCents = toUsdCents(amountBdt);

  if (usdCents < STRIPE_MINIMUM_USD_CENTS) {
    throw new AppError(
      422,
      `This booking is too small to charge. Stripe requires at least ${STRIPE_MINIMUM_USD_CENTS} cents, this is ${usdCents}.`,
    );
  }

  const payment =
    existing === null
      ? await prisma.payment.create({
          data: {
            bookingId,
            farmerId,
            amount: usdCents / 100,
            currency: "usd",
            amountBdt,
            fxRate: env.DEMO_FX_RATE,
          },
          select: { id: true },
        })
      : await prisma.payment.update({
          where: { id: existing.id },
          data: {
            amount: usdCents / 100,
            amountBdt,
            fxRate: env.DEMO_FX_RATE,
            status: "PENDING",
          },
          select: { id: true },
        });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: usdCents,
          product_data: {
            name: `Cold storage - Lot ${booking.lotCode}`,
            description: `${booking.quantityKg}kg of ${booking.cropType.name} in ${booking.chamber.warehouse.name} / ${booking.chamber.name}`,
          },
        },
      },
    ],
    metadata: { bookingId, paymentId: payment.id },
    success_url: `${env.APP_URL}/api/v1/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/api/v1/payments/cancel?session_id={CHECKOUT_SESSION_ID}`,
  });

  if (session.url === null) {
    throw new AppError(502, "Stripe did not return a checkout URL");
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  });

  return {
    paymentId: payment.id,
    sessionId: session.id,
    checkoutUrl: session.url,
    amount: usdCents / 100,
    currency: "usd",
    expiresAt: session.expires_at === null ? null : new Date(session.expires_at * 1000),
  };
};

const constructWebhookEvent = (rawBody: Buffer, signature: string | undefined): Stripe.Event => {
  if (!isStripeWebhookConfigured) {
    throw new AppError(
      503,
      "Stripe webhook secret is not configured, so payment events cannot be verified",
    );
  }

  if (signature === undefined) {
    throw new AppError(400, "Missing stripe-signature header");
  }

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AppError(400, `Invalid webhook signature: ${message}`);
  }
};

const markPaymentSucceeded = async (session: Stripe.Checkout.Session): Promise<void> => {
  const paymentId = session.metadata?.paymentId;
  const bookingId = session.metadata?.bookingId;

  if (paymentId === undefined || bookingId === undefined) {
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
        ...(paymentIntentId === null ? {} : { stripePaymentIntentId: paymentIntentId }),
      },
    });

    if (updated.count === 0) {
      return;
    }

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });

    if (booking?.status === "APPROVED") {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "PAID" },
      });

      await writeAuditLog(tx, {
        actorId: null,
        action: "PAYMENT_SUCCEEDED",
        entityType: "Booking",
        entityId: bookingId,
        before: { status: booking.status },
        after: { status: "PAID", paymentId },
      });

      return;
    }

    await writeAuditLog(tx, {
      actorId: null,
      action: "PAYMENT_SUCCEEDED_WITHOUT_BOOKING",
      entityType: "Booking",
      entityId: bookingId,
      before: { status: booking?.status ?? "MISSING" },
      after: { paymentId, needsManualRefund: true },
    });
  });
};

const markPaymentFailed = async (
  paymentId: string | undefined,
  bookingId: string | undefined,
  reason: string,
): Promise<void> => {
  if (paymentId === undefined) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "FAILED" },
    });

    if (updated.count === 0 || bookingId === undefined) {
      return;
    }

    await writeAuditLog(tx, {
      actorId: null,
      action: "PAYMENT_FAILED",
      entityType: "Booking",
      entityId: bookingId,
      after: { paymentId, reason },
    });
  });
};

const handleWebhookEvent = async (event: Stripe.Event): Promise<string> => {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status === "paid") {
      await markPaymentSucceeded(session);
      return "payment recorded";
    }

    return "session completed but not paid";
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    await markPaymentFailed(
      session.metadata?.paymentId,
      session.metadata?.bookingId,
      "Checkout session expired",
    );
    return "session expiry recorded";
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    await markPaymentFailed(
      intent.metadata?.paymentId,
      intent.metadata?.bookingId,
      intent.last_payment_error?.message ?? "Payment failed",
    );
    return "payment failure recorded";
  }

  return `ignored ${event.type}`;
};

const getPaymentStatusBySessionId = async (sessionId: string): Promise<IPayment> => {
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: sessionId },
    select: paymentSelect,
  });

  if (!payment) {
    throw new AppError(404, "No payment found for that checkout session");
  }

  return toPayment(payment);
};

const getMyPaymentsFromDb = async (
  farmerId: string,
  filters: IPaymentFilters,
): Promise<{ data: IPayment[]; meta: PaginationMeta }> => {
  const pagination = buildPagination(filters, ["createdAt"], "createdAt");

  const where: Prisma.PaymentWhereInput = {
    farmerId,
    ...(filters.status === undefined ? {} : { status: filters.status }),
  };

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: paymentSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.payment.count({ where }),
  ]);

  return { data: rows.map(toPayment), meta: buildMeta(pagination.page, pagination.limit, total) };
};

const getPaymentByIdFromDb = async (id: string, actor: IPaymentActor): Promise<IPayment> => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: paymentSelect,
  });

  if (!payment) {
    throw new AppError(404, "Payment not found");
  }

  if (actor.role !== "ADMIN" && payment.farmerId !== actor.id) {
    throw new AppError(403, "You do not have access to this payment");
  }

  return toPayment(payment);
};

const refundPaymentDb = async (
  paymentId: string,
  adminId: string,
  reason: string | undefined,
  ip: string | undefined,
): Promise<IPayment> => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: paymentSelect,
  });

  if (!payment) {
    throw new AppError(404, "Payment not found");
  }

  if (payment.status === "REFUNDED") {
    throw new AppError(409, "This payment has already been refunded");
  }

  if (payment.status !== "SUCCEEDED") {
    throw new AppError(
      409,
      `Only a SUCCEEDED payment can be refunded. This one is ${payment.status}.`,
    );
  }

  if (payment.stripePaymentIntentId === null) {
    throw new AppError(
      409,
      "This payment has no Stripe payment intent recorded and cannot be refunded automatically",
    );
  }

  try {
    await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe error";
    throw new AppError(502, `Stripe refused the refund: ${message}`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED", refundedAt: new Date() },
      select: paymentSelect,
    });

    await writeAuditLog(tx, {
      actorId: adminId,
      action: "PAYMENT_REFUNDED",
      entityType: "Payment",
      entityId: paymentId,
      before: { status: payment.status },
      after: { status: updated.status, reason: reason ?? null },
      ip,
    });

    return toPayment(updated);
  });
};

export const paymentService = {
  createCheckoutSessionDb,
  constructWebhookEvent,
  handleWebhookEvent,
  getPaymentStatusBySessionId,
  getMyPaymentsFromDb,
  getPaymentByIdFromDb,
  refundPaymentDb,
};
