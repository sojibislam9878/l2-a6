import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { type IPublicUser, publicUserSelect, toPublicUser } from "../../utils/publicUser.js";
import type { IUpdateMePayload } from "./user.interface.js";

const getMeFromDb = async (userId: string): Promise<IPublicUser> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: publicUserSelect,
  });

  if (!user) {
    throw new AppError(404, "Account not found");
  }

  return toPublicUser(user);
};

const updateMeDb = async (userId: string, payload: IUpdateMePayload): Promise<IPublicUser> => {
  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(404, "Account not found");
  }

  const data: { name?: string; phone?: string } = {};

  if (payload.name !== undefined) {
    data.name = payload.name;
  }

  if (payload.phone !== undefined) {
    data.phone = payload.phone;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: publicUserSelect,
  });

  return toPublicUser(user);
};

export const userService = {
  getMeFromDb,
  updateMeDb,
};
