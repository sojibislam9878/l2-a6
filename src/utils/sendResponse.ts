import type { Response } from "express";

export type ResponseMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SuccessPayload<T> = {
  statusCode: number;
  message: string;
  data?: T;
  meta?: ResponseMeta;
};

export const sendResponse = <T>(res: Response, payload: SuccessPayload<T>): void => {
  const body: Record<string, unknown> = {
    success: true,
    message: payload.message,
  };

  if (payload.data !== undefined) {
    body.data = payload.data;
  }

  if (payload.meta !== undefined) {
    body.meta = payload.meta;
  }

  res.status(payload.statusCode).json(body);
};
