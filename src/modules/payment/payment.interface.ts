import type { z } from "zod";
import type { PaymentStatus, Role } from "../../../generated/prisma/client.js";
import type {
  createCheckoutSessionSchema,
  listPaymentsSchema,
  refundPaymentSchema,
} from "./payment.validation.js";

export type ICreateCheckoutSessionPayload = z.infer<typeof createCheckoutSessionSchema>["body"];

export type IPaymentFilters = z.infer<typeof listPaymentsSchema>["query"];

export type IRefundPaymentPayload = z.infer<typeof refundPaymentSchema>["body"];

export type IPaymentActor = { id: string; role: Role };

export type IPayment = {
  id: string;
  bookingId: string;
  lotCode: string;
  amount: number;
  currency: string;
  amountBdt: number;
  fxRate: number;
  provider: string;
  status: PaymentStatus;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
};

export type ICheckoutSession = {
  paymentId: string;
  sessionId: string;
  checkoutUrl: string;
  amountBdt: number;
  amountUsd: number;
  fxRate: number;
  expiresAt: Date | null;
};
