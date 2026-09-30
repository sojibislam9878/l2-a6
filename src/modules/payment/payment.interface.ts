import type { z } from "zod";
import type { BookingStatus, PaymentStatus, Role } from "../../../generated/prisma/client.js";
import type {
  createCheckoutSessionSchema,
  listAllPaymentsSchema,
  listPaymentsSchema,
  refundPaymentSchema,
} from "./payment.validation.js";

export type ICreateCheckoutSessionPayload = z.infer<typeof createCheckoutSessionSchema>["body"];

export type IPaymentFilters = z.infer<typeof listPaymentsSchema>["query"];

export type IAdminPaymentFilters = z.infer<typeof listAllPaymentsSchema>["query"];

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

export type IAdminPayment = IPayment & {
  refundable: boolean;
  booking: {
    id: string;
    status: BookingStatus;
    cancelReason: string | null;
    farmer: { id: string; name: string; email: string };
    warehouse: { id: string; name: string; district: string };
  };
};

export type ICheckoutSession = {
  paymentId: string;
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
  expiresAt: Date | null;
};
