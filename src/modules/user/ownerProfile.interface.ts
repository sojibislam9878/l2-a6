import type { z } from "zod";
import type { createOwnerProfileSchema, updateOwnerProfileSchema } from "./ownerProfile.validation.js";

export type ICreateOwnerProfilePayload = z.infer<typeof createOwnerProfileSchema>["body"];

export type IUpdateOwnerProfilePayload = z.infer<typeof updateOwnerProfileSchema>["body"];

export type IOwnerProfile = {
  id: string;
  businessName: string;
  tradeLicenseNo: string;
  nid: string;
  district: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
};
