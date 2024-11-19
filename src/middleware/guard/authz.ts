import type { AccountDbType } from "@/database/schema";
import { errorResponse } from "@/pkg/errors/http";
import type { HonoEnv } from "@/pkg/hono/env";
import { getCtxUser } from "@/pkg/lib/context";
import { logger } from "@/pkg/logger/logger";
import { createMiddleware } from "hono/factory";

export const checkRole = ({
  role = "user",
}: {
  role?: AccountDbType["role"];
} = {}) => {
  return createMiddleware<HonoEnv>(async (c, next) => {
    const user = getCtxUser();
    if (!user) {
      return errorResponse(c, "UNAUTHORIZED");
    }

    if (user.role !== role) {
      logger.error(`User ${user.id} with role ${user.role} tried to access ${role} only route`);
      return errorResponse(c, "FORBIDDEN");
    }

    return next();
  });
};

export const hasAdminAccess = checkRole({ role: "admin" });
