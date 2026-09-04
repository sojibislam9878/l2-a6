import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { writeAuditLog } from "../../utils/auditLogger.js";
import { invalidateWarehouseCache } from "../../utils/cacheKeys.js";
import { buildMeta, buildPagination, type PaginationMeta } from "../../utils/paginate.js";
import type {
  IAdminUser,
  IAdminUserDetail,
  IAuditLogEntry,
  IAuditLogFilters,
  IPlatformStats,
  IUpdateUserRolePayload,
  IUpdateUserStatusPayload,
  IUpdateWarehouseStatusPayload,
  IUserFilters,
} from "./admin.interface.js";
import { USER_SORT_FIELDS } from "./admin.validation.js";

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  password: true,
  googleId: true,
  emailVerifiedAt: true,
  deletedAt: true,
  createdAt: true,
  ownerProfile: { select: { id: true } },
} as const;

type RawAdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: IAdminUser["role"];
  status: IAdminUser["status"];
  password: string | null;
  googleId: string | null;
  emailVerifiedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  ownerProfile: { id: string } | null;
};

const toAdminUser = (row: RawAdminUser): IAdminUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  status: row.status,
  emailVerified: row.emailVerifiedAt !== null,
  hasPassword: row.password !== null,
  linkedGoogle: row.googleId !== null,
  profileComplete: row.role === "WAREHOUSE_OWNER" ? row.ownerProfile !== null : true,
  deletedAt: row.deletedAt,
  createdAt: row.createdAt,
});

const updateWarehouseStatusDb = async (
  warehouseId: string,
  adminId: string,
  payload: IUpdateWarehouseStatusPayload,
  ip: string | undefined,
) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { id: true, name: true, status: true },
  });

  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }

  if (warehouse.status === payload.status) {
    throw new AppError(409, `This warehouse is already ${payload.status}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.warehouse.update({
      where: { id: warehouseId },
      data: { status: payload.status },
      select: { id: true, name: true, status: true },
    });

    await writeAuditLog(tx, {
      actorId: adminId,
      action: "WAREHOUSE_STATUS_CHANGED",
      entityType: "Warehouse",
      entityId: warehouseId,
      before: { status: warehouse.status },
      after: { status: next.status, reason: payload.reason ?? null },
      ip,
    });

    return next;
  });

  await invalidateWarehouseCache(warehouseId);

  return updated;
};

const getUsersFromDb = async (
  filters: IUserFilters,
): Promise<{ data: IAdminUser[]; meta: PaginationMeta }> => {
  const pagination = buildPagination(filters, USER_SORT_FIELDS, "createdAt");

  const where: Prisma.UserWhereInput = {};

  if (filters.includeDeleted !== "true") {
    where.deletedAt = null;
  }

  if (filters.role !== undefined) where.role = filters.role;
  if (filters.status !== undefined) where.status = filters.status;

  if (filters.verified !== undefined) {
    where.emailVerifiedAt = filters.verified === "true" ? { not: null } : null;
  }

  if (filters.search !== undefined) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: adminUserSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: rows.map(toAdminUser),
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
};

const getUserByIdFromDb = async (id: string): Promise<IAdminUserDetail> => {
  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      ...adminUserSelect,
      farmerProfile: {
        select: { district: true, upazila: true, nid: true, farmSizeAcre: true },
      },
      ownerProfile: {
        select: {
          id: true,
          businessName: true,
          tradeLicenseNo: true,
          nid: true,
          district: true,
          address: true,
        },
      },
      _count: { select: { warehouses: true, bookings: true } },
    },
  });

  if (!row) {
    throw new AppError(404, "User not found");
  }

  const { farmerProfile, ownerProfile, _count, ...base } = row;

  return {
    ...toAdminUser({
      ...base,
      ownerProfile: ownerProfile === null ? null : { id: ownerProfile.id },
    }),
    farmerProfile:
      farmerProfile === null
        ? null
        : {
            district: farmerProfile.district,
            upazila: farmerProfile.upazila,
            nid: farmerProfile.nid,
            farmSizeAcre:
              farmerProfile.farmSizeAcre === null ? null : Number(farmerProfile.farmSizeAcre),
          },
    ownerProfile:
      ownerProfile === null
        ? null
        : {
            businessName: ownerProfile.businessName,
            tradeLicenseNo: ownerProfile.tradeLicenseNo,
            nid: ownerProfile.nid,
            district: ownerProfile.district,
            address: ownerProfile.address,
          },
    counts: { warehouses: _count.warehouses, bookings: _count.bookings },
  };
};

const loadTargetUser = async (id: string, adminId: string) => {
  if (id === adminId) {
    throw new AppError(403, "You cannot change your own account through the admin API");
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true, deletedAt: true },
  });

  if (!target || target.deletedAt !== null) {
    throw new AppError(404, "User not found");
  }

  if (target.role === "ADMIN") {
    throw new AppError(403, "Admin accounts cannot be modified through this API");
  }

  return target;
};

const updateUserStatusDb = async (
  id: string,
  adminId: string,
  payload: IUpdateUserStatusPayload,
  ip: string | undefined,
) => {
  const target = await loadTargetUser(id, adminId);

  if (target.status === payload.status) {
    throw new AppError(409, `This account is already ${payload.status}`);
  }

  return prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id },
      data: { status: payload.status },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    await writeAuditLog(tx, {
      actorId: adminId,
      action: payload.status === "BANNED" ? "USER_BANNED" : "USER_UNBANNED",
      entityType: "User",
      entityId: id,
      before: { status: target.status },
      after: { status: next.status, reason: payload.reason ?? null },
      ip,
    });

    return next;
  });
};

const updateUserRoleDb = async (
  id: string,
  adminId: string,
  payload: IUpdateUserRolePayload,
  ip: string | undefined,
) => {
  const target = await loadTargetUser(id, adminId);

  if (target.role === payload.role) {
    throw new AppError(409, `This account is already a ${payload.role}`);
  }

  if (target.role === "WAREHOUSE_OWNER") {
    const warehouses = await prisma.warehouse.count({
      where: { ownerId: id, deletedAt: null },
    });

    if (warehouses > 0) {
      throw new AppError(
        409,
        `Cannot change this role while the account still owns ${warehouses} warehouse(s)`,
      );
    }
  }

  if (target.role === "FARMER") {
    const activeBookings = await prisma.booking.count({
      where: {
        farmerId: id,
        deletedAt: null,
        status: { in: ["PENDING_APPROVAL", "APPROVED", "PAID", "STORED", "WITHDRAW_REQUESTED"] },
      },
    });

    if (activeBookings > 0) {
      throw new AppError(
        409,
        `Cannot change this role while the account has ${activeBookings} active booking(s)`,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id },
      data: { role: payload.role },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    await writeAuditLog(tx, {
      actorId: adminId,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: id,
      before: { role: target.role },
      after: { role: next.role, reason: payload.reason ?? null },
      ip,
    });

    return next;
  });
};

const getAuditLogsFromDb = async (
  filters: IAuditLogFilters,
): Promise<{ data: IAuditLogEntry[]; meta: PaginationMeta }> => {
  const pagination = buildPagination(filters, ["createdAt"], "createdAt");

  const where: Prisma.AuditLogWhereInput = {};

  if (filters.entityType !== undefined) where.entityType = filters.entityType;
  if (filters.entityId !== undefined) where.entityId = filters.entityId;
  if (filters.actorId !== undefined) where.actorId = filters.actorId;
  if (filters.action !== undefined) {
    where.action = { contains: filters.action, mode: "insensitive" };
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        before: true,
        after: true,
        ip: true,
        createdAt: true,
        actor: { select: { id: true, name: true, role: true } },
      },
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: rows,
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
};

const getPlatformStatsFromDb = async (): Promise<IPlatformStats> => {
  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    deletedUsers,
    unverifiedUsers,
    usersByRole,
    totalWarehouses,
    warehousesByStatus,
    chambers,
    totalBookings,
    bookingsByStatus,
    payments,
    districts,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.user.count({ where: { deletedAt: null, status: "BANNED" } }),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.user.count({ where: { deletedAt: null, emailVerifiedAt: null } }),
    prisma.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: true }),
    prisma.warehouse.count({ where: { deletedAt: null } }),
    prisma.warehouse.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    prisma.chamber.aggregate({
      where: { deletedAt: null },
      _count: true,
      _sum: { capacityKg: true },
    }),
    prisma.booking.count({ where: { deletedAt: null } }),
    prisma.booking.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED" },
      _count: true,
      _sum: { amountBdt: true },
    }),
    prisma.warehouse.groupBy({
      by: ["district"],
      where: { deletedAt: null, status: "APPROVED" },
      _count: true,
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      banned: bannedUsers,
      deleted: deletedUsers,
      unverified: unverifiedUsers,
      byRole: Object.fromEntries(usersByRole.map((row) => [row.role, row._count])),
    },
    warehouses: {
      total: totalWarehouses,
      byStatus: Object.fromEntries(warehousesByStatus.map((row) => [row.status, row._count])),
    },
    chambers: {
      total: chambers._count,
      totalCapacityKg: chambers._sum.capacityKg ?? 0,
    },
    bookings: {
      total: totalBookings,
      byStatus: Object.fromEntries(bookingsByStatus.map((row) => [row.status, row._count])),
    },
    payments: {
      succeeded: payments._count,
      revenueBdt: Number(payments._sum.amountBdt ?? 0),
    },
    topDistricts: districts
      .map((row) => ({ district: row.district, warehouses: row._count }))
      .sort((a, b) => b.warehouses - a.warehouses)
      .slice(0, 5),
  };
};

export const adminService = {
  updateWarehouseStatusDb,
  getUsersFromDb,
  getUserByIdFromDb,
  updateUserStatusDb,
  updateUserRoleDb,
  getAuditLogsFromDb,
  getPlatformStatsFromDb,
};
