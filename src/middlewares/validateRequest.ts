import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validateRequest =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    const parsed = result.data as { body?: unknown };

    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }

    next();
  };
