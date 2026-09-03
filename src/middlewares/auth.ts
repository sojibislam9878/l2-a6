import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { jwtUtils } from "../utils/jwt.js";

const BEARER_PREFIX = "Bearer ";

export const auth: RequestHandler = catchAsync(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
    throw new AppError(401, "Authentication required. Send an Authorization: Bearer <token> header.");
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  if (token.length === 0) {
    throw new AppError(401, "Authentication token is missing");
  }

  const decoded = jwtUtils.verifyAccessToken(token);

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: { id: true, email: true, role: true, status: true, deletedAt: true },
  });

  if (!user || user.deletedAt !== null) {
    throw new AppError(401, "This account no longer exists");
  }

  if (user.status === "BANNED") {
    throw new AppError(403, "This account has been banned. Contact support for help.");
  }

  req.user = { id: user.id, email: user.email, role: user.role };

  next();
});
