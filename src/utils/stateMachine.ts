import type { BookingStatus } from "../../generated/prisma/client.js";
import { AppError } from "./AppError.js";

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PAID", "EXPIRED", "CANCELLED"],
  PAID: ["STORED", "CANCELLED"],
  STORED: ["WITHDRAW_REQUESTED"],
  WITHDRAW_REQUESTED: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const canTransition = (from: BookingStatus, to: BookingStatus): boolean =>
  ALLOWED_TRANSITIONS[from].includes(to);

export const assertTransition = (from: BookingStatus, to: BookingStatus): void => {
  if (canTransition(from, to)) {
    return;
  }

  const allowed = ALLOWED_TRANSITIONS[from];

  const detail =
    allowed.length === 0
      ? `${from} is a final state`
      : `from ${from} you can only move to ${allowed.join(", ")}`;

  throw new AppError(409, `Cannot move this booking from ${from} to ${to} - ${detail}`);
};

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "PENDING_APPROVAL",
  "APPROVED",
  "PAID",
  "STORED",
  "WITHDRAW_REQUESTED",
];
