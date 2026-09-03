import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  ICreateOwnerProfilePayload,
  IOwnerProfile,
  IUpdateOwnerProfilePayload,
} from "./owner.interface.js";

const ownerProfileSelect = {
  id: true,
  businessName: true,
  tradeLicenseNo: true,
  nid: true,
  district: true,
  address: true,
  createdAt: true,
  updatedAt: true,
} as const;

const assertWarehouseOwner = (role: string): void => {
  if (role !== "WAREHOUSE_OWNER") {
    throw new AppError(403, "Only warehouse owners have a business profile");
  }
};

const createOwnerProfileDb = async (
  userId: string,
  role: string,
  payload: ICreateOwnerProfilePayload,
): Promise<IOwnerProfile> => {
  assertWarehouseOwner(role);

  const existing = await prisma.ownerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      409,
      "Your warehouse owner profile already exists. Use PATCH /api/v1/users/me/owner-profile to update it.",
    );
  }

  return prisma.ownerProfile.create({
    data: { userId, ...payload },
    select: ownerProfileSelect,
  });
};

const getOwnerProfileFromDb = async (userId: string, role: string): Promise<IOwnerProfile> => {
  assertWarehouseOwner(role);

  const profile = await prisma.ownerProfile.findUnique({
    where: { userId },
    select: ownerProfileSelect,
  });

  if (!profile) {
    throw new AppError(404, "You have not created your warehouse owner profile yet");
  }

  return profile;
};

const updateOwnerProfileDb = async (
  userId: string,
  role: string,
  payload: IUpdateOwnerProfilePayload,
): Promise<IOwnerProfile> => {
  assertWarehouseOwner(role);

  const existing = await prisma.ownerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(
      404,
      "You have not created your warehouse owner profile yet. Use POST /api/v1/users/me/owner-profile first.",
    );
  }

  const data: {
    businessName?: string;
    tradeLicenseNo?: string;
    nid?: string;
    district?: string;
    address?: string;
  } = {};

  if (payload.businessName !== undefined) data.businessName = payload.businessName;
  if (payload.tradeLicenseNo !== undefined) data.tradeLicenseNo = payload.tradeLicenseNo;
  if (payload.nid !== undefined) data.nid = payload.nid;
  if (payload.district !== undefined) data.district = payload.district;
  if (payload.address !== undefined) data.address = payload.address;

  return prisma.ownerProfile.update({
    where: { userId },
    data,
    select: ownerProfileSelect,
  });
};

export const ownerService = {
  createOwnerProfileDb,
  getOwnerProfileFromDb,
  updateOwnerProfileDb,
};
