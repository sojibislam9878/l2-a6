import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { env } from "../../config/env.js";
import { GOOGLE_SCOPES, googleClient } from "../../lib/google.js";
import { sendEmail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import { connectRedis, redis } from "../../lib/redis.js";
import { AppError } from "../../utils/AppError.js";
import { buildOtpEmail } from "../../utils/emailTemplates.js";
import { jwtUtils } from "../../utils/jwt.js";
import { consumeOtp, issueOtp } from "../../utils/otp.js";
import {
  type IPublicUser,
  publicUserSelect,
  type SelectedUser,
  toPublicUser,
} from "../../utils/publicUser.js";
import { isJtiRevoked, revokeJti } from "../../utils/tokenDenylist.js";
import type {
  GoogleAuthMode,
  IAuthResult,
  ILoginPayload,
  ISignupPayload,
} from "./auth.interface.js";
import { SELF_SERVICE_ROLES } from "./auth.validation.js";

const credentialsSelect = {
  ...publicUserSelect,
  password: true,
  deletedAt: true,
  emailVerifiedAt: true,
} as const;

const VERIFY_EMAIL_HINT =
  "Email not verified. Submit the code sent to your email at POST /api/v1/auth/verify-otp";

const deliverOtp = async (email: string, name: string): Promise<void> => {
  const code = await issueOtp(email);
  const { subject, html, text } = buildOtpEmail(name, code);
  await sendEmail({ to: email, subject, html, text });
};

const INVALID_CREDENTIALS = "Invalid email or password";

let decoyHash: string | null = null;

const equalizeTimingForMissingUser = async (): Promise<void> => {
  if (decoyHash === null) {
    decoyHash = await bcrypt.hash(randomUUID(), env.BCRYPT_SALT_ROUNDS);
  }
  await bcrypt.compare(randomUUID(), decoyHash);
};

const issueAuthResult = (user: SelectedUser): IAuthResult => {
  const { accessToken, refreshToken } = jwtUtils.createTokenPair({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return { accessToken, refreshToken, user: toPublicUser(user) };
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

  await deliverOtp(user.email, user.name);

  return toPublicUser(user);
};

const verifyEmailOtpDb = async (rawEmail: string, code: string): Promise<IPublicUser> => {
  const email = rawEmail.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...publicUserSelect, deletedAt: true, emailVerifiedAt: true },
  });

  if (!user || user.deletedAt !== null) {
    throw new AppError(404, "No account found for this email");
  }

  if (user.emailVerifiedAt !== null) {
    throw new AppError(409, "This email is already verified. You can log in.");
  }

  await consumeOtp(email, code);

  const { deletedAt: _deletedAt, emailVerifiedAt: _verifiedAt, ...publicFields } = user;

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  return toPublicUser(publicFields);
};

const resendEmailOtpDb = async (rawEmail: string): Promise<void> => {
  const email = rawEmail.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true, deletedAt: true, emailVerifiedAt: true },
  });

  if (!user || user.deletedAt !== null) {
    return;
  }

  if (user.emailVerifiedAt !== null) {
    return;
  }

  await deliverOtp(email, user.name);
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

  if (user.emailVerifiedAt === null) {
    throw new AppError(403, VERIFY_EMAIL_HINT);
  }

  const {
    password: _password,
    deletedAt: _deletedAt,
    emailVerifiedAt: _verifiedAt,
    ...publicFields
  } = user;

  return issueAuthResult(publicFields);
};

const refreshTokensDb = async (refreshToken: string): Promise<IAuthResult> => {
  const decoded = jwtUtils.verifyRefreshToken(refreshToken);

  if (await isJtiRevoked(decoded.jti)) {
    throw new AppError(401, "This session has been logged out. Please log in again.");
  }

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

  if (user.emailVerifiedAt === null) {
    throw new AppError(403, VERIFY_EMAIL_HINT);
  }

  const {
    password: _password,
    deletedAt: _deletedAt,
    emailVerifiedAt: _verifiedAt,
    ...publicFields
  } = user;

  await revokeJti(decoded.jti, decoded.exp);

  return issueAuthResult(publicFields);
};

const logoutDb = async (refreshToken: string | undefined): Promise<void> => {
  if (refreshToken === undefined || refreshToken.length === 0) {
    return;
  }

  try {
    const decoded = jwtUtils.verifyRefreshToken(refreshToken);
    await revokeJti(decoded.jti, decoded.exp);
  } catch {
    return;
  }
};

const setPasswordDb = async (userId: string, newPassword: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    throw new AppError(404, "Account not found");
  }

  if (user.password !== null) {
    throw new AppError(
      409,
      "This account already has a password. Use POST /api/v1/auth/change-password instead.",
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
};

const changePasswordDb = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    throw new AppError(404, "Account not found");
  }

  if (user.password === null) {
    throw new AppError(
      409,
      "This account signs in with Google and has no password yet. Use POST /api/v1/auth/set-password instead.",
    );
  }

  const currentMatches = await bcrypt.compare(currentPassword, user.password);

  if (!currentMatches) {
    throw new AppError(401, "Current password is incorrect");
  }

  if (currentPassword === newPassword) {
    throw new AppError(400, "New password must be different from the current password");
  }

  const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
};

const GOOGLE_STATE_TTL_SECONDS = 300;
const stateKey = (state: string) => `oauth:google:state:${state}`;

const createGoogleAuthUrl = async (mode: GoogleAuthMode): Promise<string> => {
  await connectRedis();
  const state = randomUUID();
  await redis.set(stateKey(state), mode, "EX", GOOGLE_STATE_TTL_SECONDS);

  return googleClient.generateAuthUrl({
    scope: GOOGLE_SCOPES,
    state,
    prompt: "select_account",
  });
};

const consumeGoogleState = async (state: string): Promise<GoogleAuthMode> => {
  await connectRedis();
  const stored = await redis.get(stateKey(state));

  if (stored === null) {
    throw new AppError(400, "This sign-in link has expired or was already used. Start again.");
  }

  await redis.del(stateKey(state));
  return stored === "json" ? "json" : "redirect";
};

const googleAuthDb = async (code: string): Promise<IAuthResult> => {
  const { tokens } = await googleClient.getToken(code);

  if (!tokens.id_token) {
    throw new AppError(401, "Google did not return an identity token");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const profile = ticket.getPayload();

  if (!profile?.email) {
    throw new AppError(401, "Google did not share an email address for this account");
  }

  if (profile.email_verified !== true) {
    throw new AppError(403, "This Google account does not have a verified email address");
  }

  const email = profile.email.toLowerCase();
  const googleId = profile.sub;
  const name = profile.name ?? email;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
    select: { ...credentialsSelect, googleId: true },
  });

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        googleId,
        role: "FARMER",
        emailVerifiedAt: new Date(),
      },
      select: publicUserSelect,
    });

    return issueAuthResult(created);
  }

  if (existing.deletedAt !== null) {
    throw new AppError(403, "This account has been deleted");
  }

  if (existing.status === "BANNED") {
    throw new AppError(403, "This account has been banned. Contact support for help.");
  }

  if (existing.role !== "FARMER") {
    throw new AppError(
      403,
      "Google sign-in is available to farmers only. Log in with your email and password instead.",
    );
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      googleId,
      emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
    },
    select: publicUserSelect,
  });

  return issueAuthResult(updated);
};

export const authService = {
  registerUserDb,
  loginUserDb,
  refreshTokensDb,
  verifyEmailOtpDb,
  resendEmailOtpDb,
  logoutDb,
  setPasswordDb,
  changePasswordDb,
  createGoogleAuthUrl,
  consumeGoogleState,
  googleAuthDb,
};
