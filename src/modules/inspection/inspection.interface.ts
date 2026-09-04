import type { z } from "zod";
import type { QualityGrade, Role } from "../../../generated/prisma/client.js";
import type { createInspectionSchema, listInspectionsSchema } from "./inspection.validation.js";

export type ICreateInspectionPayload = z.infer<typeof createInspectionSchema>["body"];

export type IInspectionFilters = z.infer<typeof listInspectionsSchema>["query"];

export type IInspectionActor = { id: string; role: Role };

export type IInspection = {
  id: string;
  grade: QualityGrade;
  moisturePct: number | null;
  actualQtyKg: number;
  notes: string | null;
  inspectedAt: Date;
  inspector: { id: string; name: string };
  booking: {
    id: string;
    lotCode: string;
    status: string;
    quantityKg: number;
    farmer: { id: string; name: string };
    warehouse: { id: string; name: string };
  };
};
