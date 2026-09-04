import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { invalidateCropTypeCache } from "../../utils/cacheKeys.js";
import type {
  ICreateCropTypePayload,
  ICropType,
  ICropTypeFilters,
  IUpdateCropTypePayload,
} from "./cropType.interface.js";

const cropTypeSelect = {
  id: true,
  name: true,
  idealMinTempC: true,
  idealMaxTempC: true,
  maxStorageDays: true,
} as const;

type RawCropType = {
  id: string;
  name: string;
  idealMinTempC: unknown;
  idealMaxTempC: unknown;
  maxStorageDays: number;
};

const toCropType = (row: RawCropType): ICropType => ({
  id: row.id,
  name: row.name,
  idealMinTempC: Number(row.idealMinTempC),
  idealMaxTempC: Number(row.idealMaxTempC),
  maxStorageDays: row.maxStorageDays,
});

const ACTIVE_BOOKING_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "PAID",
  "STORED",
  "WITHDRAW_REQUESTED",
] as const;

const getCropTypesFromDb = async (filters: ICropTypeFilters): Promise<ICropType[]> => {
  const rows = await prisma.cropType.findMany({
    where: {
      deletedAt: null,
      ...(filters.search === undefined
        ? {}
        : { name: { contains: filters.search, mode: "insensitive" } }),
    },
    select: cropTypeSelect,
    orderBy: { name: "asc" },
  });

  return rows.map(toCropType);
};

const getCropTypeByIdFromDb = async (id: string): Promise<ICropType> => {
  const row = await prisma.cropType.findFirst({
    where: { id, deletedAt: null },
    select: cropTypeSelect,
  });

  if (!row) {
    throw new AppError(404, "Crop type not found");
  }

  return toCropType(row);
};

const createCropTypeDb = async (payload: ICreateCropTypePayload): Promise<ICropType> => {
  const row = await prisma.cropType.create({ data: payload, select: cropTypeSelect });
  await invalidateCropTypeCache();
  return toCropType(row);
};

const updateCropTypeDb = async (
  id: string,
  payload: IUpdateCropTypePayload,
): Promise<ICropType> => {
  const existing = await prisma.cropType.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, idealMinTempC: true, idealMaxTempC: true },
  });

  if (!existing) {
    throw new AppError(404, "Crop type not found");
  }

  const nextMin = payload.idealMinTempC ?? Number(existing.idealMinTempC);
  const nextMax = payload.idealMaxTempC ?? Number(existing.idealMaxTempC);

  if (nextMax < nextMin) {
    throw new AppError(422, "idealMaxTempC must be greater than or equal to idealMinTempC");
  }

  const data: {
    name?: string;
    idealMinTempC?: number;
    idealMaxTempC?: number;
    maxStorageDays?: number;
  } = {};

  if (payload.name !== undefined) data.name = payload.name;
  if (payload.idealMinTempC !== undefined) data.idealMinTempC = payload.idealMinTempC;
  if (payload.idealMaxTempC !== undefined) data.idealMaxTempC = payload.idealMaxTempC;
  if (payload.maxStorageDays !== undefined) data.maxStorageDays = payload.maxStorageDays;

  const row = await prisma.cropType.update({ where: { id }, data, select: cropTypeSelect });
  await invalidateCropTypeCache();
  return toCropType(row);
};

const softDeleteCropTypeDb = async (id: string): Promise<void> => {
  const existing = await prisma.cropType.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(404, "Crop type not found");
  }

  const activeBookings = await prisma.booking.count({
    where: {
      cropTypeId: id,
      deletedAt: null,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
  });

  if (activeBookings > 0) {
    throw new AppError(
      409,
      `Cannot delete this crop type while ${activeBookings} active booking(s) still reference it`,
    );
  }

  await prisma.cropType.update({ where: { id }, data: { deletedAt: new Date() } });
  await invalidateCropTypeCache();
};

export const cropTypeService = {
  getCropTypesFromDb,
  getCropTypeByIdFromDb,
  createCropTypeDb,
  updateCropTypeDb,
  softDeleteCropTypeDb,
};
