import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { writeAuditLog } from "../../utils/auditLogger.js";
import { type PaginationMeta, buildMeta, buildPagination } from "../../utils/paginate.js";
import { assertTransition } from "../../utils/stateMachine.js";
import type {
  ICreateInspectionPayload,
  IInspection,
  IInspectionActor,
  IInspectionFilters,
} from "./inspection.interface.js";

const inspectionSelect = {
  id: true,
  grade: true,
  moisturePct: true,
  actualQtyKg: true,
  notes: true,
  inspectedAt: true,
  inspector: { select: { id: true, name: true } },
  booking: {
    select: {
      id: true,
      lotCode: true,
      status: true,
      quantityKg: true,
      farmer: { select: { id: true, name: true } },
      chamber: {
        select: { warehouse: { select: { id: true, name: true, ownerId: true } } },
      },
    },
  },
} as const;

type RawInspection = {
  id: string;
  grade: IInspection["grade"];
  moisturePct: unknown;
  actualQtyKg: number;
  notes: string | null;
  inspectedAt: Date;
  inspector: { id: string; name: string };
  booking: {
    id: string;
    lotCode: string;
    status: string;
    quantityKg: number;
    farmer: { id: string; name: string };
    chamber: { warehouse: { id: string; name: string; ownerId: string } };
  };
};

const toInspection = (row: RawInspection): IInspection => ({
  id: row.id,
  grade: row.grade,
  moisturePct: row.moisturePct === null ? null : Number(row.moisturePct),
  actualQtyKg: row.actualQtyKg,
  notes: row.notes,
  inspectedAt: row.inspectedAt,
  inspector: row.inspector,
  booking: {
    id: row.booking.id,
    lotCode: row.booking.lotCode,
    status: row.booking.status,
    quantityKg: row.booking.quantityKg,
    farmer: row.booking.farmer,
    warehouse: {
      id: row.booking.chamber.warehouse.id,
      name: row.booking.chamber.warehouse.name,
    },
  },
});

const createInspectionDb = async (
  bookingId: string,
  inspectorId: string,
  payload: ICreateInspectionPayload,
  ip: string | undefined,
): Promise<IInspection> => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: { id: true, lotCode: true, status: true, quantityKg: true },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  if (booking.status !== "PAID") {
    throw new AppError(
      409,
      `Intake inspection is only possible on a PAID booking. This one is ${booking.status}.`,
    );
  }

  const existing = await prisma.inspection.findUnique({
    where: { bookingId },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(409, "This lot has already been inspected");
  }

  if (payload.grade === "REJECTED") {
    assertTransition(booking.status, "CANCELLED");
  }

  return prisma.$transaction(async (tx) => {
    if (payload.grade === "REJECTED") {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          cancelReason: "Failed intake quality inspection",
        },
      });
    }

    const created = await tx.inspection.create({
      data: {
        bookingId,
        inspectorId,
        grade: payload.grade,
        actualQtyKg: payload.actualQtyKg,
        ...(payload.moisturePct === undefined ? {} : { moisturePct: payload.moisturePct }),
        ...(payload.notes === undefined ? {} : { notes: payload.notes }),
      },
      select: inspectionSelect,
    });

    await writeAuditLog(tx, {
      actorId: inspectorId,
      action: "INSPECTION_RECORDED",
      entityType: "Booking",
      entityId: bookingId,
      after: {
        grade: payload.grade,
        actualQtyKg: payload.actualQtyKg,
        declaredQtyKg: booking.quantityKg,
      },
      ip,
    });

    if (payload.grade === "REJECTED") {
      await writeAuditLog(tx, {
        actorId: inspectorId,
        action: "BOOKING_CANCELLED",
        entityType: "Booking",
        entityId: bookingId,
        before: { status: booking.status },
        after: { status: "CANCELLED", reason: "Failed intake quality inspection" },
        ip,
      });
    }

    return toInspection(created);
  });
};

const getInspectionsFromDb = async (
  filters: IInspectionFilters,
): Promise<{ data: IInspection[]; meta: PaginationMeta }> => {
  const pagination = buildPagination(filters, ["inspectedAt"], "inspectedAt");

  const where: Prisma.InspectionWhereInput = {};

  if (filters.grade !== undefined) where.grade = filters.grade;
  if (filters.bookingId !== undefined) where.bookingId = filters.bookingId;

  const [rows, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      select: inspectionSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.inspection.count({ where }),
  ]);

  return { data: rows.map(toInspection), meta: buildMeta(pagination.page, pagination.limit, total) };
};

const getInspectionByIdFromDb = async (
  id: string,
  actor: IInspectionActor,
): Promise<IInspection> => {
  const row = await prisma.inspection.findUnique({
    where: { id },
    select: inspectionSelect,
  });

  if (!row) {
    throw new AppError(404, "Inspection not found");
  }

  const isAdmin = actor.role === "ADMIN";
  const isFarmer = row.booking.farmer.id === actor.id;
  const isOwner = row.booking.chamber.warehouse.ownerId === actor.id;

  if (!isAdmin && !isFarmer && !isOwner) {
    throw new AppError(403, "You do not have access to this inspection");
  }

  return toInspection(row);
};

export const inspectionService = {
  createInspectionDb,
  getInspectionsFromDb,
  getInspectionByIdFromDb,
};
