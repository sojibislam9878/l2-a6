import type { z } from "zod";
import type { AccountStatus, Role } from "../../../generated/prisma/client.js";
import type {
  listAuditLogsSchema,
  listUsersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  updateWarehouseStatusSchema,
} from "./admin.validation.js";

export type IUpdateWarehouseStatusPayload = z.infer<typeof updateWarehouseStatusSchema>["body"];

export type IUserFilters = z.infer<typeof listUsersSchema>["query"];

export type IUpdateUserStatusPayload = z.infer<typeof updateUserStatusSchema>["body"];

export type IUpdateUserRolePayload = z.infer<typeof updateUserRoleSchema>["body"];

export type IAuditLogFilters = z.infer<typeof listAuditLogsSchema>["query"];

export type IAdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  hasPassword: boolean;
  linkedGoogle: boolean;
  profileComplete: boolean;
  deletedAt: Date | null;
  createdAt: Date;
};

export type IAdminUserDetail = IAdminUser & {
  farmerProfile: {
    district: string;
    upazila: string | null;
    nid: string | null;
    farmSizeAcre: number | null;
  } | null;
  ownerProfile: {
    businessName: string;
    tradeLicenseNo: string;
    nid: string;
    district: string;
    address: string;
  } | null;
  counts: {
    warehouses: number;
    bookings: number;
  };
};

export type IAuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: Date;
  actor: { id: string; name: string; role: Role } | null;
};

export type IPlatformStats = {
  users: {
    total: number;
    active: number;
    banned: number;
    deleted: number;
    unverified: number;
    byRole: Record<string, number>;
  };
  warehouses: {
    total: number;
    byStatus: Record<string, number>;
  };
  chambers: {
    total: number;
    totalCapacityKg: number;
  };
  bookings: {
    total: number;
    byStatus: Record<string, number>;
  };
  payments: {
    succeeded: number;
    revenueBdt: number;
  };
  topDistricts: { district: string; warehouses: number }[];
};
