import { lucia } from "@/pkg/auth/lucia";
import { ApiError } from "@/pkg/errors/http";
import type { HonoEnv } from "@/pkg/hono/env";
import { getCtxTenant } from "@/pkg/lib/context";
import { createMiddleware } from "hono/factory";

// TODO: add opentelemetry tracing

function getBearerAuthToken(authToken?: string) {
  if (!authToken) {
    return null;
  }
  const [type, token] = authToken.split(" ");
  if (type !== "Bearer") {
    return null;
  }
  return token;
}

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const tenant = getCtxTenant();
  const authorizationToken = c.req.header("Authorization");
  const token = getBearerAuthToken(authorizationToken);
  if (!token) {
    c.set("user", null);
    return next();
  }

  const { session, user } = await lucia.validateSession(token);

  if (session?.fresh) {
    c.get("logger").info("session needs to be refreshed");
  }

  if (user) {
    if (user.tenantId !== tenant.publicId) {
      c.get("logger").error("user does not belong to tenant");
      throw new ApiError({
        code: "UNAUTHORIZED",
        message: "User does not belong to tenant",
      });
    }
  }

  c.set("user", user);
  c.set("session", session);

  return next();
});
