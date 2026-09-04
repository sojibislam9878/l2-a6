import type { z } from "zod";
import type {
  createChamberSchema,
  listChambersSchema,
  updateChamberSchema,
} from "./chamber.validation.js";

export type ICreateChamberPayload = z.infer<typeof createChamberSchema>["body"];

export type IUpdateChamberPayload = z.infer<typeof updateChamberSchema>["body"];

export type IChamberFilters = z.infer<typeof listChambersSchema>["query"];

export type IChamber = {
  id: string;
  warehouseId: string;
  name: string;
  capacityKg: number;
  minTempC: number;
  maxTempC: number;
  isActive: boolean;
  createdAt: Date;
};
