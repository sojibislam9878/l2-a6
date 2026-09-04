import type { RequestHandler } from "express";
import type { Role } from "../../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";

export const authorize =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    const current = req.user;

    if (current === undefined) {
      next(new AppError(401, "Authentication required"));
      return;
    }

    if (!allowed.includes(current.role)) {
      next(new AppError(403, `This action is restricted to: ${allowed.join(", ")}`));
      return;
    }

    next();
  };
