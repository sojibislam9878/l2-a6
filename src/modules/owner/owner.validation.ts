import { z } from "zod";

const businessName = z
  .string({ error: "businessName is required" })
  .trim()
  .min(2, { error: "businessName must be at least 2 characters" })
  .max(120, { error: "businessName must be at most 120 characters" });

const tradeLicenseNo = z
  .string({ error: "tradeLicenseNo is required" })
  .trim()
  .min(4, { error: "tradeLicenseNo must be at least 4 characters" })
  .max(40, { error: "tradeLicenseNo must be at most 40 characters" });

const nid = z
  .string({ error: "nid is required" })
  .trim()
  .regex(/^\d{10}$|^\d{13}$|^\d{17}$/, {
    error: "nid must be a valid Bangladeshi NID number (10, 13 or 17 digits)",
  });

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

export const createOwnerProfileSchema = z.object({
  body: z.object({ businessName, tradeLicenseNo, nid, district, address }).strict(),
});

export const updateOwnerProfileSchema = z.object({
  body: z
    .object({
      businessName: businessName.optional(),
      tradeLicenseNo: tradeLicenseNo.optional(),
      nid: nid.optional(),
      district: district.optional(),
      address: address.optional(),
    })
    .strict()
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      error: "Provide at least one field to update",
    }),
});
