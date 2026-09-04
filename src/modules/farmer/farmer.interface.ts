import type { z } from "zod";
import type { createFarmerProfileSchema, updateFarmerProfileSchema } from "./farmer.validation.js";

export type ICreateFarmerProfilePayload = z.infer<typeof createFarmerProfileSchema>["body"];

export type IUpdateFarmerProfilePayload = z.infer<typeof updateFarmerProfileSchema>["body"];

export type IFarmerProfile = {
  id: string;
  district: string;
  upazila: string | null;
  nid: string | null;
  farmSizeAcre: number | null;
  createdAt: Date;
  updatedAt: Date;
};
