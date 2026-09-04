import type { z } from "zod";
import type {
  createCropTypeSchema,
  listCropTypesSchema,
  updateCropTypeSchema,
} from "./cropType.validation.js";

export type ICreateCropTypePayload = z.infer<typeof createCropTypeSchema>["body"];

export type IUpdateCropTypePayload = z.infer<typeof updateCropTypeSchema>["body"];

export type ICropTypeFilters = z.infer<typeof listCropTypesSchema>["query"];

export type ICropType = {
  id: string;
  name: string;
  idealMinTempC: number;
  idealMaxTempC: number;
  maxStorageDays: number;
};
