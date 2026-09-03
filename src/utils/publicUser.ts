import type { AccountStatus, Role } from "../../generated/prisma/client.js";

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

export type SelectedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
};

export type IPublicUser = SelectedUser & {
  profileComplete: boolean;
};

export const hasCompleteProfile = (role: Role, ownerProfileExists: boolean): boolean =>
  role === "WAREHOUSE_OWNER" ? ownerProfileExists : true;

export const toPublicUser = (user: SelectedUser, ownerProfileExists: boolean): IPublicUser => ({
  ...user,
  profileComplete: hasCompleteProfile(user.role, ownerProfileExists),
});
