import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../../generated/prisma/client.js";

export type TokenSubject = {
  sub: string;
  email: string;
  role: Role;
};

export type TokenPayload = TokenSubject & {
  jti: string;
  iat: number;
  exp: number;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

const asExpiry = (value: string) => value as NonNullable<jwt.SignOptions["expiresIn"]>;

const createTokenPair = (subject: TokenSubject): TokenPair => {
  const jti = randomUUID();

  return {
    accessToken: jwt.sign({ ...subject, jti }, env.JWT_ACCESS_SECRET, {
      expiresIn: asExpiry(env.JWT_ACCESS_EXPIRES_IN),
    }),
    refreshToken: jwt.sign({ ...subject, jti }, env.JWT_REFRESH_SECRET, {
      expiresIn: asExpiry(env.JWT_REFRESH_EXPIRES_IN),
    }),
  };
};

const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;

const verifyRefreshToken = (token: string): TokenPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;

export const jwtUtils = {
  createTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
};
