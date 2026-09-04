import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { type PaginationMeta, buildMeta, buildPagination } from "../../utils/paginate.js";
import type {
  ICreateWarehousePayload,
  IMyWarehouseFilters,
  IUpdateWarehousePayload,
  IWarehouseDetail,
  IWarehouseFilters,
  IWarehouseSummary,
} from "./warehouse.interface.js";
import { WAREHOUSE_SORT_FIELDS } from "./warehouse.validation.js";

const warehouseSelect = {
  id: true,
  name: true,
  district: true,
  address: true,
  licenseNo: true,
  ratePerKgPerDay: true,
  minBookingDays: true,
  status: true,
  avgRating: true,
  reviewCount: true,
  createdAt: true,
  chambers: {
    where: { deletedAt: null, isActive: true },
    select: { capacityKg: true },
  },
} as const;

type RawWarehouse = {
  id: string;
  name: string;
  district: string;
  address: string;
  licenseNo: string;
  ratePerKgPerDay: unknown;
  minBookingDays: number;
  status: IWarehouseSummary["status"];
  avgRating: unknown;
  reviewCount: number;
  createdAt: Date;
  chambers: { capacityKg: number }[];
};

const toSummary = (row: RawWarehouse): IWarehouseSummary => ({
  id: row.id,
  name: row.name,
  district: row.district,
  address: row.address,
  ratePerKgPerDay: Number(row.ratePerKgPerDay),
  minBookingDays: row.minBookingDays,
  status: row.status,
  avgRating: row.avgRating === null ? null : Number(row.avgRating),
  reviewCount: row.reviewCount,
  chamberCount: row.chambers.length,
  totalCapacityKg: row.chambers.reduce((sum, chamber) => sum + chamber.capacityKg, 0),
  createdAt: row.createdAt,
});

const buildChamberFilter = async (
  filters: IWarehouseFilters,
): Promise<Prisma.ChamberWhereInput | undefined> => {
  const chamberWhere: Prisma.ChamberWhereInput = { deletedAt: null, isActive: true };
  let applied = false;

  if (filters.minCapacityKg !== undefined) {
    chamberWhere.capacityKg = { gte: filters.minCapacityKg };
    applied = true;
  }

  if (filters.cropTypeId !== undefined) {
    const crop = await prisma.cropType.findFirst({
      where: { id: filters.cropTypeId, deletedAt: null },
      select: { idealMinTempC: true, idealMaxTempC: true },
    });

    if (!crop) {
      throw new AppError(404, "Crop type not found");
    }

    chamberWhere.minTempC = { lte: crop.idealMinTempC };
    chamberWhere.maxTempC = { gte: crop.idealMaxTempC };
    applied = true;
  }

  return applied ? chamberWhere : undefined;
};

const getWarehousesFromDb = async (
  filters: IWarehouseFilters,
): Promise<{ data: IWarehouseSummary[]; meta: PaginationMeta }> => {
  const pagination = buildPagination(filters, WAREHOUSE_SORT_FIELDS, "createdAt");

  const where: Prisma.WarehouseWhereInput = { deletedAt: null, status: "APPROVED" };

  if (filters.district !== undefined) {
    where.district = { equals: filters.district, mode: "insensitive" };
  }

  if (filters.search !== undefined) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { address: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.minRate !== undefined || filters.maxRate !== undefined) {
    where.ratePerKgPerDay = {
      ...(filters.minRate === undefined ? {} : { gte: filters.minRate }),
      ...(filters.maxRate === undefined ? {} : { lte: filters.maxRate }),
    };
  }

  if (filters.minRating !== undefined) {
    where.avgRating = { gte: filters.minRating };
  }

  const chamberFilter = await buildChamberFilter(filters);

  if (chamberFilter !== undefined) {
    where.chambers = { some: chamberFilter };
  }

  const [rows, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      select: warehouseSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.warehouse.count({ where }),
  ]);

  return {
    data: rows.map(toSummary),
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
};

const getMyWarehousesFromDb = async (
  ownerId: string,
  filters: IMyWarehouseFilters,
): Promise<{ data: IWarehouseSummary[]; meta: PaginationMeta }> => {
  const pagination = buildPagination(filters, WAREHOUSE_SORT_FIELDS, "createdAt");

  const where: Prisma.WarehouseWhereInput = {
    ownerId,
    deletedAt: null,
    ...(filters.status === undefined ? {} : { status: filters.status }),
  };

  const [rows, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      select: warehouseSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.warehouse.count({ where }),
  ]);

  return {
    data: rows.map(toSummary),
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
};

const getWarehouseByIdFromDb = async (id: string): Promise<IWarehouseDetail> => {
  const row = await prisma.warehouse.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...warehouseSelect,
      owner: {
        select: {
          id: true,
          name: true,
          ownerProfile: { select: { businessName: true } },
        },
      },
    },
  });

  if (!row) {
    throw new AppError(404, "Warehouse not found");
  }

  const { owner, ...rest } = row;

  return {
    ...toSummary(rest),
    licenseNo: rest.licenseNo,
    owner: {
      id: owner.id,
      name: owner.name,
      businessName: owner.ownerProfile?.businessName ?? null,
    },
  };
};

const assertOwnership = async (warehouseId: string, ownerId: string): Promise<void> => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { ownerId: true },
  });

  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }

  if (warehouse.ownerId !== ownerId) {
    throw new AppError(403, "You can only manage warehouses that belong to you");
  }
};

const createWarehouseDb = async (
  ownerId: string,
  payload: ICreateWarehousePayload,
): Promise<IWarehouseDetail> => {
  const created = await prisma.warehouse.create({
    data: {
      ownerId,
      name: payload.name,
      district: payload.district,
      address: payload.address,
      licenseNo: payload.licenseNo,
      ratePerKgPerDay: payload.ratePerKgPerDay,
      ...(payload.minBookingDays === undefined
        ? {}
        : { minBookingDays: payload.minBookingDays }),
    },
    select: { id: true },
  });

  return getWarehouseByIdFromDb(created.id);
};

const updateWarehouseDb = async (
  id: string,
  ownerId: string,
  payload: IUpdateWarehousePayload,
): Promise<IWarehouseDetail> => {
  await assertOwnership(id, ownerId);

  const data: {
    name?: string;
    district?: string;
    address?: string;
    licenseNo?: string;
    ratePerKgPerDay?: number;
    minBookingDays?: number;
  } = {};

  if (payload.name !== undefined) data.name = payload.name;
  if (payload.district !== undefined) data.district = payload.district;
  if (payload.address !== undefined) data.address = payload.address;
  if (payload.licenseNo !== undefined) data.licenseNo = payload.licenseNo;
  if (payload.ratePerKgPerDay !== undefined) data.ratePerKgPerDay = payload.ratePerKgPerDay;
  if (payload.minBookingDays !== undefined) data.minBookingDays = payload.minBookingDays;

  await prisma.warehouse.update({ where: { id }, data });

  return getWarehouseByIdFromDb(id);
};

const softDeleteWarehouseDb = async (id: string, ownerId: string): Promise<void> => {
  await assertOwnership(id, ownerId);

  const activeLots = await prisma.booking.count({
    where: {
      deletedAt: null,
      status: { in: ["PAID", "STORED", "WITHDRAW_REQUESTED"] },
      chamber: { warehouseId: id },
    },
  });

  if (activeLots > 0) {
    throw new AppError(
      409,
      `Cannot delete this warehouse while ${activeLots} lot(s) are still stored in it`,
    );
  }

  const deletedAt = new Date();

  await prisma.$transaction([
    prisma.chamber.updateMany({ where: { warehouseId: id, deletedAt: null }, data: { deletedAt } }),
    prisma.warehouse.update({ where: { id }, data: { deletedAt } }),
  ]);
};

export const warehouseService = {
  getWarehousesFromDb,
  getMyWarehousesFromDb,
  getWarehouseByIdFromDb,
  createWarehouseDb,
  updateWarehouseDb,
  softDeleteWarehouseDb,
};
