import type { z } from "zod";
import type { WarehouseStatus } from "../../../generated/prisma/client.js";
import type {
  createWarehouseSchema,
  listMyWarehousesSchema,
  listWarehousesSchema,
  updateWarehouseSchema,
  warehouseReviewsSchema,
} from "./warehouse.validation.js";

export type ICreateWarehousePayload = z.infer<typeof createWarehouseSchema>["body"];

export type IUpdateWarehousePayload = z.infer<typeof updateWarehouseSchema>["body"];

export type IWarehouseFilters = z.infer<typeof listWarehousesSchema>["query"];

export type IMyWarehouseFilters = z.infer<typeof listMyWarehousesSchema>["query"];

export type IWarehouseReviewFilters = z.infer<typeof warehouseReviewsSchema>["query"];

export type IWarehouseSummary = {
  id: string;
  name: string;
  district: string;
  address: string;
  ratePerKgPerDay: number;
  minBookingDays: number;
  status: WarehouseStatus;
  avgRating: number | null;
  reviewCount: number;
  chamberCount: number;
  totalCapacityKg: number;
  createdAt: Date;
};

export type IWarehouseDetail = IWarehouseSummary & {
  licenseNo: string;
  owner: {
    id: string;
    name: string;
    businessName: string | null;
  };
};
