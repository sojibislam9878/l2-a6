import type { ErrorRequestHandler } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { isProduction } from "../config/env.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";

type ErrorDetail = {
  path: string;
  message: string;
};

const REQUEST_PARTS = new Set(["body", "params", "query"]);

const toFieldPath = (segments: PropertyKey[]): string => {
  const parts = segments.map(String);
  const first = parts[0];
  return (first !== undefined && REQUEST_PARTS.has(first) ? parts.slice(1) : parts).join(".");
};

type AdapterCause = {
  constraint?: { index?: string; fields?: string[] };
  table?: string;
};

const adapterCauseOf = (meta: Record<string, unknown> | undefined): AdapterCause | undefined => {
  const wrapper = meta?.driverAdapterError as { cause?: AdapterCause } | undefined;
  return wrapper?.cause;
};

const targetOf = (meta: Record<string, unknown> | undefined): string => {
  const target = meta?.target;
  if (Array.isArray(target)) return target.join(", ");
  if (typeof target === "string") return target;

  const cause = adapterCauseOf(meta);

  if (cause?.constraint?.fields !== undefined) {
    return cause.constraint.fields.join(", ");
  }

  const index = cause?.constraint?.index;

  if (typeof index === "string") {
    const withoutTable =
      cause?.table !== undefined && index.startsWith(`${cause.table}_`)
        ? index.slice(cause.table.length + 1)
        : index;
    return withoutTable.replace(/_key$/, "").split("_").join(" ");
  }

  return "value";
};

export const globalErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode = 500;
  let message = "Internal server error";
  let errors: ErrorDetail[] = [];

  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    errors = error.issues.map((issue) => ({
      path: toFieldPath(issue.path),
      message: issue.message,
    }));
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = 409;
      const field = targetOf(error.meta);
      message = `Duplicate value: ${field} already exists`;
      errors = [{ path: field, message: "Must be unique" }];
    } else if (error.code === "P2025") {
      statusCode = 404;
      message = "Resource not found";
    } else if (error.code === "P2003") {
      statusCode = 400;
      message = "Invalid reference: related record does not exist";
    } else {
      statusCode = 400;
      message = `Database request failed (${error.code})`;
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid database query arguments";
  } else if (error instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    message = "Session expired, please log in again";
  } else if (error instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    message = "Invalid authentication token";
  } else if (error instanceof Error) {
    message = isProduction ? "Internal server error" : error.message;
  }

  if (statusCode >= 500 && !isProduction) {
    console.error(error);
  }

  const body: Record<string, unknown> = {
    success: false,
    message,
    errors,
  };

  if (!isProduction && error instanceof Error && error.stack !== undefined) {
    body.stack = error.stack;
  }

  res.status(statusCode).json(body);
};
