import type { App } from "@/pkg/hono/app";
import { logger } from "@/pkg/logger/logger";

export const setupUserApiRoutes = (app: App) => {
  logger.log("🚀 ~ setupUserApiRoutes ~ app:", app);
};
