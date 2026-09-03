import type { z } from "zod";
import type { AccountStatus, Role } from "../../../generated/prisma/client.js";
import type { signupSchema } from "./auth.validation.js";

export type ISignupPayload = z.infer<typeof signupSchema>["body"];

export type ISelfServiceRole = ISignupPayload["role"];

export type IPublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  profileComplete: boolean;
  createdAt: Date;
};
