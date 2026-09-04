import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { type PaginationMeta, buildMeta, buildPagination } from "../../utils/paginate.js";
import type { IReview, IReviewFilters } from "./review.interface.js";

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
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        farmer: { select: { id: true, name: true } },
      },
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

export const reviewService = {
  getWarehouseReviewsFromDb,
};
