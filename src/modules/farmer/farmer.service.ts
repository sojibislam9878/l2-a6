import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  ICreateFarmerProfilePayload,
  IFarmerProfile,
  IUpdateFarmerProfilePayload,
} from "./farmer.interface.js";

const farmerProfileSelect = {
  id: true,
  district: true,
  upazila: true,
  nid: true,
  farmSizeAcre: true,
  createdAt: true,
  updatedAt: true,
} as const;

type RawFarmerProfile = {
  id: string;
  district: string;
  upazila: string | null;
  nid: string | null;
  farmSizeAcre: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const toFarmerProfile = (row: RawFarmerProfile): IFarmerProfile => ({
  id: row.id,
  district: row.district,
  upazila: row.upazila,
  nid: row.nid,
  farmSizeAcre: row.farmSizeAcre === null ? null : Number(row.farmSizeAcre),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const assertFarmer = (role: string): void => {
  if (role !== "FARMER") {
    throw new AppError(403, "Only farmers have a farming profile");
  }
};

const createFarmerProfileDb = async (
  userId: string,
  role: string,
  payload: ICreateFarmerProfilePayload,
): Promise<IFarmerProfile> => {
  assertFarmer(role);

  const existing = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      409,
      "Your farming profile already exists. Use PATCH /api/v1/users/me/farmer-profile to update it.",
    );
  }

  const created = await prisma.farmerProfile.create({
    data: {
      userId,
      district: payload.district,
      upazila: payload.upazila ?? null,
      nid: payload.nid ?? null,
      farmSizeAcre: payload.farmSizeAcre ?? null,
    },
    select: farmerProfileSelect,
  });

  return toFarmerProfile(created);
};

const getFarmerProfileFromDb = async (userId: string, role: string): Promise<IFarmerProfile> => {
  assertFarmer(role);

  const profile = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: farmerProfileSelect,
  });

  if (!profile) {
    throw new AppError(404, "You have not created your farming profile yet");
  }

  return toFarmerProfile(profile);
};

const updateFarmerProfileDb = async (
  userId: string,
  role: string,
  payload: IUpdateFarmerProfilePayload,
): Promise<IFarmerProfile> => {
  assertFarmer(role);

  const existing = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(
      404,
      "You have not created your farming profile yet. Use POST /api/v1/users/me/farmer-profile first.",
    );
  }

  const data: {
    district?: string;
    upazila?: string;
    nid?: string;
    farmSizeAcre?: number;
  } = {};

  if (payload.district !== undefined) data.district = payload.district;
  if (payload.upazila !== undefined) data.upazila = payload.upazila;
  if (payload.nid !== undefined) data.nid = payload.nid;
  if (payload.farmSizeAcre !== undefined) data.farmSizeAcre = payload.farmSizeAcre;

  const updated = await prisma.farmerProfile.update({
    where: { userId },
    data,
    select: farmerProfileSelect,
  });

  return toFarmerProfile(updated);
};

export const farmerService = {
  createFarmerProfileDb,
  getFarmerProfileFromDb,
  updateFarmerProfileDb,
};
