import bcrypt from "bcrypt";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { IPublicUser, ISignupPayload } from "./auth.interface.js";
import { SELF_SERVICE_ROLES } from "./auth.validation.js";

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

type SelectedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: IPublicUser["role"];
  status: IPublicUser["status"];
  createdAt: Date;
};

const isProfileComplete = (user: Pick<SelectedUser, "role">, hasOwnerProfile: boolean): boolean =>
  user.role === "WAREHOUSE_OWNER" ? hasOwnerProfile : true;

const toPublicUser = (user: SelectedUser, hasOwnerProfile: boolean): IPublicUser => ({
  ...user,
  profileComplete: isProfileComplete(user, hasOwnerProfile),
});

const registerUserDb = async (payload: ISignupPayload): Promise<IPublicUser> => {
  if (!SELF_SERVICE_ROLES.includes(payload.role)) {
    throw new AppError(403, "ADMIN accounts cannot be created through the API");
  }

  const email = payload.email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(payload.password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email,
      password: hashedPassword,
      phone: payload.phone ?? null,
      role: payload.role,
    },
    select: publicUserSelect,
  });

  return toPublicUser(user, false);
};

export const authService = {
  registerUserDb,
};
