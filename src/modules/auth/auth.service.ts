import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { jwtUtils } from "../../utils/jwt.js";
import type { IAuthResult, ILoginPayload, IPublicUser, ISignupPayload } from "./auth.interface.js";
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

const credentialsSelect = {
  ...publicUserSelect,
  password: true,
  deletedAt: true,
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

const INVALID_CREDENTIALS = "Invalid email or password";

let decoyHash: string | null = null;

const equalizeTimingForMissingUser = async (): Promise<void> => {
  if (decoyHash === null) {
    decoyHash = await bcrypt.hash(randomUUID(), env.BCRYPT_SALT_ROUNDS);
  }
  await bcrypt.compare(randomUUID(), decoyHash);
};

const hasCompleteProfile = (role: SelectedUser["role"], ownerProfileExists: boolean): boolean =>
  role === "WAREHOUSE_OWNER" ? ownerProfileExists : true;

const toPublicUser = (user: SelectedUser, ownerProfileExists: boolean): IPublicUser => ({
  ...user,
  profileComplete: hasCompleteProfile(user.role, ownerProfileExists),
});

const issueAuthResult = (user: SelectedUser, ownerProfileExists: boolean): IAuthResult => {
  const { accessToken, refreshToken } = jwtUtils.createTokenPair({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return { accessToken, refreshToken, user: toPublicUser(user, ownerProfileExists) };
};

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

const loginUserDb = async (payload: ILoginPayload): Promise<IAuthResult> => {
  const email = payload.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: credentialsSelect,
  });

  if (!user || user.deletedAt !== null) {
    await equalizeTimingForMissingUser();
    throw new AppError(401, INVALID_CREDENTIALS);
  }

  if (user.password === null) {
    throw new AppError(
      409,
      "This account was created with Google sign-in. Continue with Google instead.",
    );
  }

  const passwordMatches = await bcrypt.compare(payload.password, user.password);

  if (!passwordMatches) {
    throw new AppError(401, INVALID_CREDENTIALS);
  }

  if (user.status === "BANNED") {
    throw new AppError(403, "This account has been banned. Contact support for help.");
  }

  const { password: _password, deletedAt: _deletedAt, ...publicFields } = user;

  return issueAuthResult(publicFields, false);
};

const refreshTokensDb = async (refreshToken: string): Promise<IAuthResult> => {
  const decoded = jwtUtils.verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: credentialsSelect,
  });

  if (!user || user.deletedAt !== null) {
    throw new AppError(401, "Session is no longer valid, please log in again");
  }

  if (user.status === "BANNED") {
    throw new AppError(403, "This account has been banned. Contact support for help.");
  }

  const { password: _password, deletedAt: _deletedAt, ...publicFields } = user;

  return issueAuthResult(publicFields, false);
};

export const authService = {
  registerUserDb,
  loginUserDb,
  refreshTokensDb,
};
