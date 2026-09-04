import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validateRequest =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    const parsed = result.data as { body?: unknown; query?: unknown; params?: unknown };

    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }

    res.locals.validated = parsed;

    next();
  };

export const validatedQuery = <T>(res: { locals: Record<string, unknown> }): T =>
  ((res.locals.validated as { query?: T } | undefined)?.query ?? {}) as T;
