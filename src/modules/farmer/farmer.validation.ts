import { z } from "zod";

const district = z
  .string({ error: "district is required" })
  .trim()
  .min(2, { error: "district must be at least 2 characters" })
  .max(60, { error: "district must be at most 60 characters" });

const upazila = z
  .string()
  .trim()
  .min(2, { error: "upazila must be at least 2 characters" })
  .max(60, { error: "upazila must be at most 60 characters" });

const nid = z
  .string()
  .trim()
  .regex(/^\d{10}$|^\d{13}$|^\d{17}$/, {
    error: "nid must be a valid Bangladeshi NID number (10, 13 or 17 digits)",
  });

const farmSizeAcre = z.coerce
  .number({ error: "farmSizeAcre must be a number" })
  .positive({ error: "farmSizeAcre must be greater than zero" })
  .max(999999, { error: "farmSizeAcre is unrealistically large" });

export const createFarmerProfileSchema = z.object({
  body: z
    .object({
      district,
      upazila: upazila.optional(),
      nid: nid.optional(),
      farmSizeAcre: farmSizeAcre.optional(),
    })
    .strict(),
});

export const updateFarmerProfileSchema = z.object({
  body: z
    .object({
      district: district.optional(),
      upazila: upazila.optional(),
      nid: nid.optional(),
      farmSizeAcre: farmSizeAcre.optional(),
    })
    .strict()
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      error: "Provide at least one field to update",
    }),
});
