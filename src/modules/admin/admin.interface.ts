import type { z } from "zod";
import type { updateWarehouseStatusSchema } from "./admin.validation.js";

export type IUpdateWarehouseStatusPayload = z.infer<typeof updateWarehouseStatusSchema>["body"];
