import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";

export const requireCompleteProfile: RequestHandler = catchAsync(async (req, _res, next) => {
  const current = req.user;

  if (current === undefined) {
    throw new AppError(401, "Authentication required");
  }

  if (current.role !== "WAREHOUSE_OWNER") {
    next();
    return;
  }

  const profile = await prisma.ownerProfile.findUnique({
    where: { userId: current.id },
    select: { id: true },
  });

  if (profile === null) {
    throw new AppError(
      403,
      "Complete your warehouse owner profile before using this feature. Submit POST /api/v1/users/me/owner-profile with businessName, tradeLicenseNo, nid, district and address.",
    );
  }

  next();
});
