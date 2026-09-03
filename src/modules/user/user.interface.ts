import type { z } from "zod";
import type { updateMeSchema } from "./user.validation.js";

export type IUpdateMePayload = z.infer<typeof updateMeSchema>["body"];
