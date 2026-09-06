import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { invalidateWarehouseCache } from "../../utils/cacheKeys.js";
import { buildMeta, buildPagination, type PaginationMeta } from "../../utils/paginate.js";
import type {
  IChamber,
  IChamberFilters,
  ICreateChamberPayload,
  IUpdateChamberPayload,
} from "./chamber.interface.js";
import { CHAMBER_SORT_FIELDS } from "./chamber.validation.js";

const chamberSelect = {
  id: true,
  warehouseId: true,
  name: true,
  capacityKg: true,
  minTempC: true,
  maxTempC: true,
  isActive: true,
  createdAt: true,
} as const;

type RawChamber = {
  id: string;
  warehouseId: string;
  name: string;
  capacityKg: number;
  minTempC: unknown;
  maxTempC: unknown;
  isActive: boolean;
  createdAt: Date;
};

const toChamber = (row: RawChamber): IChamber => ({
  id: row.id,
  warehouseId: row.warehouseId,
  name: row.name,
  capacityKg: row.capacityKg,
  minTempC: Number(row.minTempC),
  maxTempC: Number(row.maxTempC),
  isActive: row.isActive,
  createdAt: row.createdAt,
});

const assertWarehouseExists = async (warehouseId: string): Promise<void> => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { id: true },
  });

  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }
};

const assertWarehouseOwnership = async (warehouseId: string, ownerId: string): Promise<void> => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { ownerId: true },
  });

  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }

  if (warehouse.ownerId !== ownerId) {
    throw new AppError(403, "You can only manage chambers in warehouses that belong to you");
  }
};

const getChambersFromDb = async (
  warehouseId: string,
  filters: IChamberFilters,
): Promise<{ data: IChamber[]; meta: PaginationMeta }> => {
  await assertWarehouseExists(warehouseId);

  const pagination = buildPagination(
    { ...filters, sortOrder: filters.sortOrder ?? "asc" },
    CHAMBER_SORT_FIELDS,
    "name",
  );

  const where = {
    warehouseId,
    deletedAt: null,
    ...(filters.isActive === undefined ? {} : { isActive: filters.isActive === "true" }),
  };

  const [rows, total] = await Promise.all([
    prisma.chamber.findMany({
      where,
      select: chamberSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.chamber.count({ where }),
  ]);

  return {
    data: rows.map(toChamber),
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
};

const getChamberByIdFromDb = async (id: string): Promise<IChamber> => {
  const row = await prisma.chamber.findFirst({
    where: { id, deletedAt: null },
    select: chamberSelect,
  });

  if (!row) {
    throw new AppError(404, "Chamber not found");
  }

  return toChamber(row);
};

const createChamberDb = async (
  warehouseId: string,
  ownerId: string,
  payload: ICreateChamberPayload,
): Promise<IChamber> => {
  await assertWarehouseOwnership(warehouseId, ownerId);

  const row = await prisma.chamber.create({
    data: {
      warehouseId,
      name: payload.name,
      capacityKg: payload.capacityKg,
      minTempC: payload.minTempC,
      maxTempC: payload.maxTempC,
    },
    select: chamberSelect,
  });

  await invalidateWarehouseCache(warehouseId);

  return toChamber(row);
};

const updateChamberDb = async (
  id: string,
  ownerId: string,
  payload: IUpdateChamberPayload,
): Promise<IChamber> => {
  const existing = await prisma.chamber.findFirst({
    where: { id, deletedAt: null },
    select: { warehouseId: true, minTempC: true, maxTempC: true },
  });

  if (!existing) {
    throw new AppError(404, "Chamber not found");
  }

  await assertWarehouseOwnership(existing.warehouseId, ownerId);

  const nextMin = payload.minTempC ?? Number(existing.minTempC);
  const nextMax = payload.maxTempC ?? Number(existing.maxTempC);

  if (nextMax < nextMin) {
    throw new AppError(422, "maxTempC must be greater than or equal to minTempC");
  }

  const data: {
    name?: string;
    capacityKg?: number;
    minTempC?: number;
    maxTempC?: number;
    isActive?: boolean;
  } = {};

  if (payload.name !== undefined) data.name = payload.name;
  if (payload.capacityKg !== undefined) data.capacityKg = payload.capacityKg;
  if (payload.minTempC !== undefined) data.minTempC = payload.minTempC;
  if (payload.maxTempC !== undefined) data.maxTempC = payload.maxTempC;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;

  const row = await prisma.chamber.update({ where: { id }, data, select: chamberSelect });
  await invalidateWarehouseCache(existing.warehouseId);
  return toChamber(row);
};

const softDeleteChamberDb = async (id: string, ownerId: string): Promise<void> => {
  const existing = await prisma.chamber.findFirst({
    where: { id, deletedAt: null },
    select: { warehouseId: true },
  });

  if (!existing) {
    throw new AppError(404, "Chamber not found");
  }

  await assertWarehouseOwnership(existing.warehouseId, ownerId);

  const activeLots = await prisma.booking.count({
    where: {
      chamberId: id,
      deletedAt: null,
      status: { in: ["PAID", "STORED", "WITHDRAW_REQUESTED"] },
    },
  });

  if (activeLots > 0) {
    throw new AppError(
      409,
      `Cannot delete this chamber while ${activeLots} lot(s) are still stored in it`,
    );
  }

  await prisma.chamber.update({ where: { id }, data: { deletedAt: new Date() } });
  await invalidateWarehouseCache(existing.warehouseId);
};

export const chamberService = {
  getChambersFromDb,
  getChamberByIdFromDb,
  createChamberDb,
  updateChamberDb,
  softDeleteChamberDb,
};
