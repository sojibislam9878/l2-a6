import { randomBytes } from "node:crypto";
import type { BookingStatus, Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { writeAuditLog } from "../../utils/auditLogger.js";
import { peakLoadKg } from "../../utils/capacity.js";
import { type PaginationMeta, buildMeta, buildPagination } from "../../utils/paginate.js";
import { estimateCost, inclusiveDays, settleBooking } from "../../utils/pricing.js";
import { ACTIVE_BOOKING_STATUSES, assertTransition } from "../../utils/stateMachine.js";
import type {
  IActor,
  IBooking,
  IBookingFilters,
  ICreateBookingPayload,
  IWarehouseBookingFilters,
} from "./booking.interface.js";
import { BOOKING_SORT_FIELDS } from "./booking.validation.js";

const HOLD_MINUTES = 30;
const MAX_ADVANCE_DAYS = 90;

const bookingSelect = {
  id: true,
  lotCode: true,
  status: true,
  quantityKg: true,
  startDate: true,
  endDate: true,
  ratePerKgPerDay: true,
  estimatedCost: true,
  finalCost: true,
  holdExpiresAt: true,
  storedAt: true,
  withdrawnAt: true,
  cancelReason: true,
  createdAt: true,
  cropType: { select: { id: true, name: true } },
  farmer: { select: { id: true, name: true, phone: true } },
  chamber: {
    select: {
      id: true,
      name: true,
      minTempC: true,
      maxTempC: true,
      warehouse: { select: { id: true, name: true, district: true, ownerId: true } },
    },
  },
} as const;

type RawBooking = {
  id: string;
  lotCode: string;
  status: BookingStatus;
  quantityKg: number;
  startDate: Date;
  endDate: Date;
  ratePerKgPerDay: unknown;
  estimatedCost: unknown;
  finalCost: unknown;
  holdExpiresAt: Date | null;
  storedAt: Date | null;
  withdrawnAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  cropType: { id: string; name: string };
  farmer: { id: string; name: string; phone: string | null };
  chamber: {
    id: string;
    name: string;
    minTempC: unknown;
    maxTempC: unknown;
    warehouse: { id: string; name: string; district: string; ownerId: string };
  };
};

const toBooking = (row: RawBooking): IBooking => ({
  id: row.id,
  lotCode: row.lotCode,
  status: row.status,
  quantityKg: row.quantityKg,
  startDate: row.startDate,
  endDate: row.endDate,
  bookedDays: inclusiveDays(row.startDate, row.endDate),
  ratePerKgPerDay: Number(row.ratePerKgPerDay),
  estimatedCost: Number(row.estimatedCost),
  finalCost: row.finalCost === null ? null : Number(row.finalCost),
  holdExpiresAt: row.holdExpiresAt,
  storedAt: row.storedAt,
  withdrawnAt: row.withdrawnAt,
  cancelReason: row.cancelReason,
  createdAt: row.createdAt,
  cropType: row.cropType,
  chamber: {
    id: row.chamber.id,
    name: row.chamber.name,
    minTempC: Number(row.chamber.minTempC),
    maxTempC: Number(row.chamber.maxTempC),
  },
  warehouse: {
    id: row.chamber.warehouse.id,
    name: row.chamber.warehouse.name,
    district: row.chamber.warehouse.district,
  },
  farmer: row.farmer,
});

const generateLotCode = (): string =>
  `AS-${new Date().getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;

const startOfToday = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const expireStaleHolds = async (tx: Prisma.TransactionClient, chamberId: string): Promise<void> => {
  await tx.booking.updateMany({
    where: {
      chamberId,
      deletedAt: null,
      status: "APPROVED",
      holdExpiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
};

const createBookingDb = async (
  farmerId: string,
  payload: ICreateBookingPayload,
  ip: string | undefined,
): Promise<IBooking> => {
  const { chamberId, cropTypeId, quantityKg, startDate, endDate } = payload;

  const today = startOfToday();
  const latestStart = new Date(today.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000);

  if (startDate < today) {
    throw new AppError(422, "startDate cannot be in the past");
  }

  if (startDate > latestStart) {
    throw new AppError(422, `startDate cannot be more than ${MAX_ADVANCE_DAYS} days ahead`);
  }

  const chamber = await prisma.chamber.findFirst({
    where: { id: chamberId, deletedAt: null },
    select: {
      id: true,
      name: true,
      capacityKg: true,
      minTempC: true,
      maxTempC: true,
      isActive: true,
      warehouse: {
        select: {
          id: true,
          name: true,
          status: true,
          deletedAt: true,
          minBookingDays: true,
          ratePerKgPerDay: true,
        },
      },
    },
  });

  if (!chamber || chamber.warehouse.deletedAt !== null) {
    throw new AppError(404, "Chamber not found");
  }

  if (!chamber.isActive) {
    throw new AppError(409, "This chamber is not accepting lots right now");
  }

  if (chamber.warehouse.status !== "APPROVED") {
    throw new AppError(
      409,
      `This warehouse is ${chamber.warehouse.status} and cannot accept bookings yet`,
    );
  }

  const cropType = await prisma.cropType.findFirst({
    where: { id: cropTypeId, deletedAt: null },
    select: { id: true, name: true, idealMinTempC: true, idealMaxTempC: true, maxStorageDays: true },
  });

  if (!cropType) {
    throw new AppError(404, "Crop type not found");
  }

  const cropMin = Number(cropType.idealMinTempC);
  const cropMax = Number(cropType.idealMaxTempC);
  const chamberMin = Number(chamber.minTempC);
  const chamberMax = Number(chamber.maxTempC);

  if (chamberMin > cropMin || chamberMax < cropMax) {
    throw new AppError(
      422,
      `${cropType.name} needs ${cropMin} to ${cropMax}C, but chamber ${chamber.name} runs ${chamberMin} to ${chamberMax}C`,
    );
  }

  const days = inclusiveDays(startDate, endDate);

  if (days < chamber.warehouse.minBookingDays) {
    throw new AppError(
      422,
      `This warehouse requires a minimum booking of ${chamber.warehouse.minBookingDays} days, you requested ${days}`,
    );
  }

  if (days > cropType.maxStorageDays) {
    throw new AppError(
      422,
      `${cropType.name} can be stored for at most ${cropType.maxStorageDays} days, you requested ${days}`,
    );
  }

  const rate = Number(chamber.warehouse.ratePerKgPerDay);
  const estimate = estimateCost(quantityKg, rate, days);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM chambers WHERE id = ${chamberId} FOR UPDATE`;

    await expireStaleHolds(tx, chamberId);

    const competing = await tx.booking.findMany({
      where: {
        chamberId,
        deletedAt: null,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      select: { startDate: true, endDate: true, quantityKg: true },
    });

    const peak = peakLoadKg(competing, startDate, endDate);
    const free = chamber.capacityKg - peak;

    if (quantityKg > free) {
      throw new AppError(
        409,
        `Only ${free}kg is available in chamber ${chamber.name} between ${startDate.toISOString().slice(0, 10)} and ${endDate.toISOString().slice(0, 10)}`,
      );
    }

    const created = await tx.booking.create({
      data: {
        lotCode: generateLotCode(),
        farmerId,
        chamberId,
        cropTypeId,
        quantityKg,
        startDate,
        endDate,
        ratePerKgPerDay: rate,
        estimatedCost: estimate,
      },
      select: bookingSelect,
    });

    await writeAuditLog(tx, {
      actorId: farmerId,
      action: "BOOKING_CREATED",
      entityType: "Booking",
      entityId: created.id,
      after: { lotCode: created.lotCode, quantityKg, status: created.status },
      ip,
    });

    return toBooking(created);
  });
};

const loadBookingForActor = async (bookingId: string, actor: IActor) => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: bookingSelect,
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  const isFarmer = booking.farmer.id === actor.id;
  const isOwner = booking.chamber.warehouse.ownerId === actor.id;
  const isAdmin = actor.role === "ADMIN";

  if (!isFarmer && !isOwner && !isAdmin) {
    throw new AppError(403, "You do not have access to this booking");
  }

  return booking;
};

const getBookingByIdFromDb = async (bookingId: string, actor: IActor): Promise<IBooking> =>
  toBooking(await loadBookingForActor(bookingId, actor));

const getMyBookingsFromDb = async (
  farmerId: string,
  filters: IBookingFilters,
): Promise<{ data: IBooking[]; meta: PaginationMeta }> => {
  const pagination = buildPagination(filters, BOOKING_SORT_FIELDS, "createdAt");

  const where: Prisma.BookingWhereInput = {
    farmerId,
    deletedAt: null,
    ...(filters.status === undefined ? {} : { status: filters.status }),
  };

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: bookingSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.booking.count({ where }),
  ]);

  return { data: rows.map(toBooking), meta: buildMeta(pagination.page, pagination.limit, total) };
};

const getAllBookingsFromDb = async (
  filters: IBookingFilters,
): Promise<{ data: IBooking[]; meta: PaginationMeta }> => {
  const pagination = buildPagination(filters, BOOKING_SORT_FIELDS, "createdAt");

  const where: Prisma.BookingWhereInput = {
    deletedAt: null,
    ...(filters.status === undefined ? {} : { status: filters.status }),
  };

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: bookingSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.booking.count({ where }),
  ]);

  return { data: rows.map(toBooking), meta: buildMeta(pagination.page, pagination.limit, total) };
};

const getWarehouseBookingsFromDb = async (
  warehouseId: string,
  ownerId: string,
  filters: IWarehouseBookingFilters,
): Promise<{ data: IBooking[]; meta: PaginationMeta }> => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { ownerId: true },
  });

  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }

  if (warehouse.ownerId !== ownerId) {
    throw new AppError(403, "You can only view bookings for warehouses that belong to you");
  }

  const pagination = buildPagination(filters, BOOKING_SORT_FIELDS, "createdAt");

  const where: Prisma.BookingWhereInput = {
    deletedAt: null,
    chamber: { warehouseId },
    ...(filters.status === undefined ? {} : { status: filters.status }),
  };

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: bookingSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.booking.count({ where }),
  ]);

  return { data: rows.map(toBooking), meta: buildMeta(pagination.page, pagination.limit, total) };
};

const assertWarehouseOwner = (booking: RawBooking, actorId: string): void => {
  if (booking.chamber.warehouse.ownerId !== actorId) {
    throw new AppError(403, "You can only manage bookings for warehouses that belong to you");
  }
};

const transition = async (
  booking: RawBooking,
  next: BookingStatus,
  actorId: string,
  action: string,
  extraData: Prisma.BookingUpdateInput,
  ip: string | undefined,
): Promise<IBooking> => {
  assertTransition(booking.status, next);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { status: next, ...extraData },
      select: bookingSelect,
    });

    await writeAuditLog(tx, {
      actorId,
      action,
      entityType: "Booking",
      entityId: booking.id,
      before: { status: booking.status },
      after: { status: updated.status },
      ip,
    });

    return toBooking(updated);
  });
};

const approveBookingDb = async (
  bookingId: string,
  actor: IActor,
  ip: string | undefined,
): Promise<IBooking> => {
  const booking = await loadBookingForActor(bookingId, actor);
  assertWarehouseOwner(booking, actor.id);

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

  return transition(booking, "APPROVED", actor.id, "BOOKING_APPROVED", { holdExpiresAt }, ip);
};

const rejectBookingDb = async (
  bookingId: string,
  actor: IActor,
  reason: string | undefined,
  ip: string | undefined,
): Promise<IBooking> => {
  const booking = await loadBookingForActor(bookingId, actor);
  assertWarehouseOwner(booking, actor.id);

  return transition(
    booking,
    "REJECTED",
    actor.id,
    "BOOKING_REJECTED",
    { cancelReason: reason ?? null },
    ip,
  );
};

const cancelBookingDb = async (
  bookingId: string,
  actor: IActor,
  reason: string | undefined,
  ip: string | undefined,
): Promise<IBooking> => {
  const booking = await loadBookingForActor(bookingId, actor);

  if (booking.farmer.id !== actor.id) {
    throw new AppError(403, "Only the farmer who created this booking can cancel it");
  }

  return transition(
    booking,
    "CANCELLED",
    actor.id,
    "BOOKING_CANCELLED",
    { cancelReason: reason ?? null },
    ip,
  );
};

const storeBookingDb = async (
  bookingId: string,
  actor: IActor,
  ip: string | undefined,
): Promise<IBooking> => {
  const booking = await loadBookingForActor(bookingId, actor);
  assertWarehouseOwner(booking, actor.id);

  const inspection = await prisma.inspection.findUnique({
    where: { bookingId },
    select: { grade: true },
  });

  if (inspection?.grade === "REJECTED") {
    throw new AppError(
      409,
      "This lot failed quality inspection and cannot be stored. Cancel and refund it instead.",
    );
  }

  return transition(
    booking,
    "STORED",
    actor.id,
    "BOOKING_STORED",
    { storedAt: new Date() },
    ip,
  );
};

const requestWithdrawalDb = async (
  bookingId: string,
  actor: IActor,
  ip: string | undefined,
): Promise<IBooking> => {
  const booking = await loadBookingForActor(bookingId, actor);

  if (booking.farmer.id !== actor.id) {
    throw new AppError(403, "Only the farmer who owns this lot can request withdrawal");
  }

  return transition(booking, "WITHDRAW_REQUESTED", actor.id, "BOOKING_WITHDRAW_REQUESTED", {}, ip);
};

const completeBookingDb = async (
  bookingId: string,
  actor: IActor,
  ip: string | undefined,
): Promise<IBooking> => {
  const booking = await loadBookingForActor(bookingId, actor);
  assertWarehouseOwner(booking, actor.id);

  const warehouse = await prisma.warehouse.findUniqueOrThrow({
    where: { id: booking.chamber.warehouse.id },
    select: { minBookingDays: true },
  });

  const payment = await prisma.payment.findUnique({
    where: { bookingId },
    select: { amountBdt: true, status: true },
  });

  const alreadyPaidBdt =
    payment !== null && payment.status === "SUCCEEDED" ? Number(payment.amountBdt) : 0;

  const withdrawnAt = new Date();
  const storedAt = booking.storedAt ?? booking.startDate;

  const settlement = settleBooking({
    quantityKg: booking.quantityKg,
    ratePerKgPerDay: Number(booking.ratePerKgPerDay),
    bookedDays: inclusiveDays(booking.startDate, booking.endDate),
    actualDays: Math.max(1, inclusiveDays(storedAt, withdrawnAt)),
    minBookingDays: warehouse.minBookingDays,
    alreadyPaidBdt,
  });

  return transition(
    booking,
    "COMPLETED",
    actor.id,
    "BOOKING_COMPLETED",
    { withdrawnAt, finalCost: settlement.finalCost },
    ip,
  );
};

const getBookingInvoiceFromDb = async (bookingId: string, actor: IActor) => {
  const booking = await loadBookingForActor(bookingId, actor);

  const warehouse = await prisma.warehouse.findUniqueOrThrow({
    where: { id: booking.chamber.warehouse.id },
    select: { minBookingDays: true },
  });

  const payment = await prisma.payment.findUnique({
    where: { bookingId },
    select: { id: true, status: true, amountBdt: true, amount: true, currency: true, fxRate: true, paidAt: true },
  });

  const paidBdt = payment !== null && payment.status === "SUCCEEDED" ? Number(payment.amountBdt) : 0;
  const bookedDays = inclusiveDays(booking.startDate, booking.endDate);
  const storedAt = booking.storedAt;
  const endedAt = booking.withdrawnAt ?? new Date();
  const actualDays = storedAt === null ? null : Math.max(1, inclusiveDays(storedAt, endedAt));

  const settlement =
    actualDays === null
      ? null
      : settleBooking({
          quantityKg: booking.quantityKg,
          ratePerKgPerDay: Number(booking.ratePerKgPerDay),
          bookedDays,
          actualDays,
          minBookingDays: warehouse.minBookingDays,
          alreadyPaidBdt: paidBdt,
        });

  return {
    booking: toBooking(booking),
    charges: {
      quantityKg: booking.quantityKg,
      ratePerKgPerDay: Number(booking.ratePerKgPerDay),
      bookedDays,
      minBookingDays: warehouse.minBookingDays,
      estimatedCostBdt: Number(booking.estimatedCost),
      actualDaysStored: actualDays,
      settlement,
      finalCostBdt: booking.finalCost === null ? null : Number(booking.finalCost),
    },
    payment:
      payment === null
        ? null
        : {
            id: payment.id,
            status: payment.status,
            amountBdt: Number(payment.amountBdt),
            amountCharged: Number(payment.amount),
            currency: payment.currency,
            fxRate: Number(payment.fxRate),
            paidAt: payment.paidAt,
          },
    balanceBdt: (() => {
      if (booking.finalCost !== null) {
        return Number(booking.finalCost) - paidBdt;
      }
      if (settlement !== null) {
        return settlement.balance;
      }
      return Number(booking.estimatedCost) - paidBdt;
    })(),
  };
};

export const bookingService = {
  getBookingInvoiceFromDb,
  createBookingDb,
  getBookingByIdFromDb,
  getMyBookingsFromDb,
  getAllBookingsFromDb,
  getWarehouseBookingsFromDb,
  approveBookingDb,
  rejectBookingDb,
  cancelBookingDb,
  storeBookingDb,
  requestWithdrawalDb,
  completeBookingDb,
};
