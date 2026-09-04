import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { type BookingWindow, dailyLoad, peakLoadKg } from "../../utils/capacity.js";
import { inclusiveDays } from "../../utils/pricing.js";
import { ACTIVE_BOOKING_STATUSES } from "../../utils/stateMachine.js";

const DAILY_BREAKDOWN_MAX_DAYS = 92;

type Window = {
  startDate: Date;
  endDate: Date;
  cropTypeId?: string | undefined;
};

const loadCropRange = async (cropTypeId: string) => {
  const crop = await prisma.cropType.findFirst({
    where: { id: cropTypeId, deletedAt: null },
    select: { id: true, name: true, idealMinTempC: true, idealMaxTempC: true, maxStorageDays: true },
  });

  if (!crop) {
    throw new AppError(404, "Crop type not found");
  }

  return {
    id: crop.id,
    name: crop.name,
    minTempC: Number(crop.idealMinTempC),
    maxTempC: Number(crop.idealMaxTempC),
    maxStorageDays: crop.maxStorageDays,
  };
};

const competingBookings = async (
  chamberIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<Map<string, BookingWindow[]>> => {
  const rows = await prisma.booking.findMany({
    where: {
      chamberId: { in: chamberIds },
      deletedAt: null,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      status: { in: ACTIVE_BOOKING_STATUSES },
    },
    select: { chamberId: true, startDate: true, endDate: true, quantityKg: true },
  });

  const grouped = new Map<string, BookingWindow[]>();

  for (const id of chamberIds) {
    grouped.set(id, []);
  }

  for (const row of rows) {
    grouped.get(row.chamberId)?.push({
      startDate: row.startDate,
      endDate: row.endDate,
      quantityKg: row.quantityKg,
    });
  }

  return grouped;
};

const getWarehouseAvailability = async (warehouseId: string, window: Window) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      minBookingDays: true,
      ratePerKgPerDay: true,
      chambers: {
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, capacityKg: true, minTempC: true, maxTempC: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }

  const crop = window.cropTypeId === undefined ? null : await loadCropRange(window.cropTypeId);
  const days = inclusiveDays(window.startDate, window.endDate);
  const bookings = await competingBookings(
    warehouse.chambers.map((chamber) => chamber.id),
    window.startDate,
    window.endDate,
  );

  const chambers = warehouse.chambers.map((chamber) => {
    const chamberMin = Number(chamber.minTempC);
    const chamberMax = Number(chamber.maxTempC);
    const windows = bookings.get(chamber.id) ?? [];
    const peakUsedKg = peakLoadKg(windows, window.startDate, window.endDate);

    const fitsCrop =
      crop === null ? null : chamberMin <= crop.minTempC && chamberMax >= crop.maxTempC;

    return {
      id: chamber.id,
      name: chamber.name,
      capacityKg: chamber.capacityKg,
      minTempC: chamberMin,
      maxTempC: chamberMax,
      peakUsedKg,
      availableKg: Math.max(0, chamber.capacityKg - peakUsedKg),
      fitsCrop,
    };
  });

  const bookable = chambers.filter((chamber) => chamber.fitsCrop !== false);

  return {
    warehouse: {
      id: warehouse.id,
      name: warehouse.name,
      status: warehouse.status,
      minBookingDays: warehouse.minBookingDays,
      ratePerKgPerDay: Number(warehouse.ratePerKgPerDay),
    },
    window: {
      startDate: window.startDate.toISOString().slice(0, 10),
      endDate: window.endDate.toISOString().slice(0, 10),
      days,
    },
    cropType: crop,
    meetsMinBookingDays: days >= warehouse.minBookingDays,
    withinCropMaxStorageDays: crop === null ? null : days <= crop.maxStorageDays,
    totalAvailableKg: bookable.reduce((sum, chamber) => sum + chamber.availableKg, 0),
    chambers,
  };
};

const getChamberAvailability = async (chamberId: string, window: Window) => {
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
        select: { id: true, name: true, status: true, minBookingDays: true, ratePerKgPerDay: true },
      },
    },
  });

  if (!chamber) {
    throw new AppError(404, "Chamber not found");
  }

  const crop = window.cropTypeId === undefined ? null : await loadCropRange(window.cropTypeId);
  const days = inclusiveDays(window.startDate, window.endDate);
  const windows = (await competingBookings([chamberId], window.startDate, window.endDate)).get(
    chamberId,
  ) ?? [];

  const peakUsedKg = peakLoadKg(windows, window.startDate, window.endDate);
  const availableKg = Math.max(0, chamber.capacityKg - peakUsedKg);
  const chamberMin = Number(chamber.minTempC);
  const chamberMax = Number(chamber.maxTempC);

  return {
    chamber: {
      id: chamber.id,
      name: chamber.name,
      capacityKg: chamber.capacityKg,
      minTempC: chamberMin,
      maxTempC: chamberMax,
      isActive: chamber.isActive,
    },
    warehouse: {
      id: chamber.warehouse.id,
      name: chamber.warehouse.name,
      status: chamber.warehouse.status,
      minBookingDays: chamber.warehouse.minBookingDays,
      ratePerKgPerDay: Number(chamber.warehouse.ratePerKgPerDay),
    },
    window: {
      startDate: window.startDate.toISOString().slice(0, 10),
      endDate: window.endDate.toISOString().slice(0, 10),
      days,
    },
    cropType: crop,
    fitsCrop: crop === null ? null : chamberMin <= crop.minTempC && chamberMax >= crop.maxTempC,
    peakUsedKg,
    availableKg,
    overlappingBookings: windows.length,
    dailyBreakdown:
      days <= DAILY_BREAKDOWN_MAX_DAYS
        ? dailyLoad(chamber.capacityKg, windows, window.startDate, window.endDate)
        : null,
  };
};

export const availabilityService = {
  getWarehouseAvailability,
  getChamberAvailability,
};
