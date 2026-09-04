import type { z } from "zod";
import type { BookingStatus, Role } from "../../../generated/prisma/client.js";
import type {
  bookingReasonSchema,
  createBookingSchema,
  listBookingsSchema,
  warehouseBookingsSchema,
} from "./booking.validation.js";

export type ICreateBookingPayload = z.infer<typeof createBookingSchema>["body"];

export type IBookingFilters = z.infer<typeof listBookingsSchema>["query"];

export type IWarehouseBookingFilters = z.infer<typeof warehouseBookingsSchema>["query"];

export type IBookingReasonPayload = z.infer<typeof bookingReasonSchema>["body"];

export type IActor = {
  id: string;
  role: Role;
};

export type IBooking = {
  id: string;
  lotCode: string;
  status: BookingStatus;
  quantityKg: number;
  startDate: Date;
  endDate: Date;
  bookedDays: number;
  ratePerKgPerDay: number;
  estimatedCost: number;
  finalCost: number | null;
  holdExpiresAt: Date | null;
  storedAt: Date | null;
  withdrawnAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  cropType: { id: string; name: string };
  chamber: {
    id: string;
    name: string;
    minTempC: number;
    maxTempC: number;
  };
  warehouse: {
    id: string;
    name: string;
    district: string;
  };
  farmer: { id: string; name: string; phone: string | null };
};
