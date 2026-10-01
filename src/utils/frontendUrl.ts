import { env } from "../config/env.js";

export const primaryFrontendUrl = env.FRONTEND_URL[0] as string;

export const resolveFrontendUrl = (candidate: string | null | undefined): string => {
  if (!candidate) return primaryFrontendUrl;

  try {
    const origin = new URL(candidate).origin;
    return env.FRONTEND_URL.includes(origin) ? origin : primaryFrontendUrl;
  } catch {
    return primaryFrontendUrl;
  }
};
