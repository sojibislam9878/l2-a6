import type { AccountStatus, Role } from "../../generated/prisma/client.js";

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  ownerProfile: { select: { id: true } },
} as const;

export type SelectedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
  ownerProfile: { id: string } | null;
};

export type IPublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
  profileComplete: boolean;
};

export const isProfileComplete = (
  role: Role,
  ownerProfile: { id: string } | null,
): boolean => role !== "WAREHOUSE_OWNER" || ownerProfile !== null;

export const toPublicUser = (user: SelectedUser): IPublicUser => {
  const { ownerProfile, ...rest } = user;
  return { ...rest, profileComplete: isProfileComplete(user.role, ownerProfile) };
};
