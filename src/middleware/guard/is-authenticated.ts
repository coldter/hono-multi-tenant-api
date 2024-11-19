import { errorResponse } from "@/pkg/errors/http";
import type { HonoEnv } from "@/pkg/hono/env";
import { getCtxUser } from "@/pkg/lib/context";
import { logger } from "@/pkg/logger/logger";
import { createMiddleware } from "hono/factory";

export const isAuthenticated = ({
  checkProfileCompletion = true,
}: {
  checkProfileCompletion?: boolean;
} = {}) => {
  return createMiddleware<HonoEnv>(async (c, next) => {
    const user = getCtxUser();
    if (!user) {
      return errorResponse(c, "UNAUTHORIZED");
    }

    // TODO: check if user has completed profile
    logger.warn("TODO: check if user has completed profile", checkProfileCompletion);

    return next();
  });
};
