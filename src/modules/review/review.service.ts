import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { writeAuditLog } from "../../utils/auditLogger.js";
import { type PaginationMeta, buildMeta, buildPagination } from "../../utils/paginate.js";
import type {
  ICreateReviewPayload,
  IReview,
  IReviewActor,
  IReviewFilters,
  IUpdateReviewPayload,
} from "./review.interface.js";

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  farmer: { select: { id: true, name: true } },
} as const;

const recomputeWarehouseRating = async (
  tx: Prisma.TransactionClient,
  warehouseId: string,
): Promise<void> => {
  const stats = await tx.review.aggregate({
    where: { warehouseId, deletedAt: null },
    _avg: { rating: true },
    _count: true,
  });

  await tx.warehouse.update({
    where: { id: warehouseId },
    data: {
      avgRating: stats._avg.rating,
      reviewCount: stats._count,
    },
  });
};

const getWarehouseReviewsFromDb = async (
  warehouseId: string,
  filters: IReviewFilters,
): Promise<{ data: IReview[]; meta: PaginationMeta }> => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { id: true },
  });

  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }

  const pagination = buildPagination(filters, ["createdAt"], "createdAt");
  const where = { warehouseId, deletedAt: null };

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: reviewSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    data: rows,
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
};

const createReviewDb = async (
  farmerId: string,
  payload: ICreateReviewPayload,
  ip: string | undefined,
): Promise<IReview> => {
  const booking = await prisma.booking.findFirst({
    where: { id: payload.bookingId, deletedAt: null },
    select: {
      id: true,
      status: true,
      farmerId: true,
      chamber: { select: { warehouseId: true } },
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  if (booking.farmerId !== farmerId) {
    throw new AppError(403, "You can only review your own bookings");
  }

  if (booking.status !== "COMPLETED") {
    throw new AppError(
      409,
      `You can only review a COMPLETED booking. This one is ${booking.status}.`,
    );
  }

  const existing = await prisma.review.findUnique({
    where: { bookingId: payload.bookingId },
    select: { id: true, deletedAt: true },
  });

  if (existing !== null && existing.deletedAt === null) {
    throw new AppError(409, "You have already reviewed this booking");
  }

  const warehouseId = booking.chamber.warehouseId;

  return prisma.$transaction(async (tx) => {
    const review =
      existing === null
        ? await tx.review.create({
            data: {
              bookingId: payload.bookingId,
              farmerId,
              warehouseId,
              rating: payload.rating,
              comment: payload.comment ?? null,
            },
            select: reviewSelect,
          })
        : await tx.review.update({
            where: { id: existing.id },
            data: {
              rating: payload.rating,
              comment: payload.comment ?? null,
              deletedAt: null,
            },
            select: reviewSelect,
          });

    await recomputeWarehouseRating(tx, warehouseId);

    await writeAuditLog(tx, {
      actorId: farmerId,
      action: "REVIEW_CREATED",
      entityType: "Review",
      entityId: review.id,
      after: { rating: payload.rating, warehouseId, bookingId: payload.bookingId },
      ip,
    });

    return review;
  });
};

const updateReviewDb = async (
  reviewId: string,
  actor: IReviewActor,
  payload: IUpdateReviewPayload,
  ip: string | undefined,
): Promise<IReview> => {
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, deletedAt: null },
    select: { id: true, farmerId: true, warehouseId: true, rating: true },
  });

  if (!existing) {
    throw new AppError(404, "Review not found");
  }

  if (existing.farmerId !== actor.id) {
    throw new AppError(403, "You can only edit your own review");
  }

  const data: { rating?: number; comment?: string } = {};

  if (payload.rating !== undefined) data.rating = payload.rating;
  if (payload.comment !== undefined) data.comment = payload.comment;

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.update({
      where: { id: reviewId },
      data,
      select: reviewSelect,
    });

    await recomputeWarehouseRating(tx, existing.warehouseId);

    await writeAuditLog(tx, {
      actorId: actor.id,
      action: "REVIEW_UPDATED",
      entityType: "Review",
      entityId: reviewId,
      before: { rating: existing.rating },
      after: { rating: review.rating },
      ip,
    });

    return review;
  });
};

const softDeleteReviewDb = async (
  reviewId: string,
  actor: IReviewActor,
  ip: string | undefined,
): Promise<void> => {
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, deletedAt: null },
    select: { id: true, farmerId: true, warehouseId: true, rating: true },
  });

  if (!existing) {
    throw new AppError(404, "Review not found");
  }

  if (actor.role !== "ADMIN" && existing.farmerId !== actor.id) {
    throw new AppError(403, "You can only delete your own review");
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: reviewId },
      data: { deletedAt: new Date() },
    });

    await recomputeWarehouseRating(tx, existing.warehouseId);

    await writeAuditLog(tx, {
      actorId: actor.id,
      action: "REVIEW_DELETED",
      entityType: "Review",
      entityId: reviewId,
      before: { rating: existing.rating },
      ip,
    });
  });
};

export const reviewService = {
  getWarehouseReviewsFromDb,
  createReviewDb,
  updateReviewDb,
  softDeleteReviewDb,
};
