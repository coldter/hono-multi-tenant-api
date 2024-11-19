import { s } from "@/database";
import { ApiError } from "@/pkg/errors/http";
import type { HonoEnv } from "@/pkg/hono/env";
import { getCtxDatabase } from "@/pkg/lib/context";
import { storage } from "@/pkg/storage/storage";
import { and, eq, getTableColumns } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

function getDomainFromRequest(request: Request) {
  // Check various headers in order of preference
  const forwardedHost = request.headers.get("X-Forwarded-Host");
  const originalHost = request.headers.get("X-Original-Host");
  const host = request.headers.get("Host");

  // Return the first non-null/non-empty header
  return forwardedHost || originalHost || host || new URL(request.url).host;
}

export const assignTenantMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const db = getCtxDatabase();

  const reqDomain = getDomainFromRequest(c.req.raw);

  const cachedTenant = await storage.ctxTenant.getItem(reqDomain);
  if (cachedTenant) {
    c.set("tenant", cachedTenant);

    return next();
  }

  const tenant = await db
    .select({
      ...getTableColumns(s.tenants),
    })
    .from(s.tenants)
    .innerJoin(s.tenantDomains, eq(s.tenantDomains.tenantId, s.tenants.publicId))
    .where(and(eq(s.tenantDomains.domain, reqDomain), eq(s.tenants.status, "active")))
    .limit(1)
    .execute()
    .then((res) => res[0]);

  if (!tenant) {
    throw new ApiError({
      code: "TENANT_NOT_FOUND",
      message: "Tenant not found",
    });
  }

  await storage.ctxTenant.setItem(reqDomain, tenant);
  c.set("tenant", tenant);

  return next();
});
