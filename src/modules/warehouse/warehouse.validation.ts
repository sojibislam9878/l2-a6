import { z } from "zod";

export const WAREHOUSE_SORT_FIELDS = [
  "createdAt",
  "name",
  "ratePerKgPerDay",
  "avgRating",
] as const;

const name = z
  .string({ error: "name is required" })
  .trim()
  .min(3, { error: "name must be at least 3 characters" })
  .max(120, { error: "name must be at most 120 characters" });

const district = z
  .string({ error: "district is required" })
  .trim()
  .min(2, { error: "district must be at least 2 characters" })
  .max(60, { error: "district must be at most 60 characters" });

const address = z
  .string({ error: "address is required" })
  .trim()
  .min(5, { error: "address must be at least 5 characters" })
  .max(255, { error: "address must be at most 255 characters" });

const licenseNo = z
  .string({ error: "licenseNo is required" })
  .trim()
  .min(4, { error: "licenseNo must be at least 4 characters" })
  .max(40, { error: "licenseNo must be at most 40 characters" });

const ratePerKgPerDay = z.coerce
  .number({ error: "ratePerKgPerDay must be a number" })
  .positive({ error: "ratePerKgPerDay must be greater than zero" })
  .max(1000, { error: "ratePerKgPerDay is unrealistically high" });

const minBookingDays = z.coerce
  .number({ error: "minBookingDays must be a number" })
  .int({ error: "minBookingDays must be a whole number" })
  .min(1, { error: "minBookingDays must be at least 1" })
  .max(365, { error: "minBookingDays cannot exceed 365" });

export const listWarehousesSchema = z.object({
  query: z
    .object({
      search: z.string().trim().min(1).optional(),
      district: z.string().trim().min(1).optional(),
      cropTypeId: z.uuid({ error: "cropTypeId must be a valid uuid" }).optional(),
      minCapacityKg: z.coerce.number().int().positive().optional(),
      minRate: z.coerce.number().nonnegative().optional(),
      maxRate: z.coerce.number().positive().optional(),
      minRating: z.coerce.number().min(1).max(5).optional(),
      sortBy: z.enum(WAREHOUSE_SORT_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict()
    .refine(
      (query) => query.minRate === undefined || query.maxRate === undefined || query.maxRate >= query.minRate,
      { error: "maxRate must be greater than or equal to minRate", path: ["maxRate"] },
    ),
});

export const createWarehouseSchema = z.object({
  body: z
    .object({
      name,
      district,
      address,
      licenseNo,
      ratePerKgPerDay,
      minBookingDays: minBookingDays.optional(),
    })
    .strict(),
});

export const updateWarehouseSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      name: name.optional(),
      district: district.optional(),
      address: address.optional(),
      licenseNo: licenseNo.optional(),
      ratePerKgPerDay: ratePerKgPerDay.optional(),
      minBookingDays: minBookingDays.optional(),
      status: z.undefined({
        error: "Warehouse status is set by an admin, not by the owner",
      }).optional(),
    })
    .strict()
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      error: "Provide at least one field to update",
    }),
});

export const warehouseIdSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
});

export const listMyWarehousesSchema = z.object({
  query: z
    .object({
      status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
      sortBy: z.enum(WAREHOUSE_SORT_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict(),
});

export const warehouseReviewsSchema = z.object({
  params: z.object({ warehouseId: z.uuid({ error: "warehouseId must be a valid uuid" }) }),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    })
    .strict(),
});
