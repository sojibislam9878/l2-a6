import bcrypt from "bcrypt";
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

const deleteMeDb = async (userId: string, password: string | undefined): Promise<void> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new AppError(404, "Account not found");
  }

  if (user.password !== null) {
    if (password === undefined) {
      throw new AppError(400, "Confirm your password to delete this account");
    }

    const matches = await bcrypt.compare(password, user.password);

    if (!matches) {
      throw new AppError(401, "Password is incorrect");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
};

const getDashboardFromDb = async (userId: string, role: string) => {
  if (role === "FARMER") {
    const [totalBookings, activeBookings, completedBookings, payments, profile] = await Promise.all([
      prisma.booking.count({ where: { farmerId: userId, deletedAt: null } }),
      prisma.booking.count({
        where: { farmerId: userId, deletedAt: null, status: { in: ["PAID", "STORED"] } },
      }),
      prisma.booking.count({ where: { farmerId: userId, deletedAt: null, status: "COMPLETED" } }),
      prisma.payment.aggregate({
        where: { farmerId: userId, status: "SUCCEEDED" },
        _sum: { amountBdt: true },
      }),
      prisma.farmerProfile.findUnique({ where: { userId }, select: { id: true } }),
    ]);

    return {
      role,
      profileComplete: profile !== null,
      totalBookings,
      activeBookings,
      completedBookings,
      totalSpentBdt: Number(payments._sum.amountBdt ?? 0),
    };
  }

  if (role === "WAREHOUSE_OWNER") {
    const [totalWarehouses, approvedWarehouses, totalChambers, pendingBookings, profile] =
      await Promise.all([
        prisma.warehouse.count({ where: { ownerId: userId, deletedAt: null } }),
        prisma.warehouse.count({
          where: { ownerId: userId, deletedAt: null, status: "APPROVED" },
        }),
        prisma.chamber.count({
          where: { deletedAt: null, warehouse: { ownerId: userId, deletedAt: null } },
        }),
        prisma.booking.count({
          where: {
            deletedAt: null,
            status: "PENDING_APPROVAL",
            chamber: { warehouse: { ownerId: userId } },
          },
        }),
        prisma.ownerProfile.findUnique({ where: { userId }, select: { id: true } }),
      ]);

    return {
      role,
      profileComplete: profile !== null,
      totalWarehouses,
      approvedWarehouses,
      totalChambers,
      bookingsAwaitingApproval: pendingBookings,
    };
  }

  const [totalUsers, pendingWarehouses, totalBookings, revenue] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.warehouse.count({ where: { deletedAt: null, status: "PENDING" } }),
    prisma.booking.count({ where: { deletedAt: null } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountBdt: true } }),
  ]);

  return {
    role,
    profileComplete: true,
    totalUsers,
    warehousesAwaitingApproval: pendingWarehouses,
    totalBookings,
    platformRevenueBdt: Number(revenue._sum.amountBdt ?? 0),
  };
};

export const userService = {
  getMeFromDb,
  updateMeDb,
  deleteMeDb,
  getDashboardFromDb,
};
