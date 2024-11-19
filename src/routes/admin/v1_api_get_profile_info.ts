import { hasAdminAccess } from "@/middleware/guard/authz";
import { isAuthenticated } from "@/middleware/guard/is-authenticated";
import { errorResponses, successWithDataSchema } from "@/pkg/common/common-responses";
import { createRouteConfig } from "@/pkg/common/route-config";
import { errorResponse } from "@/pkg/errors/http";
import type { App } from "@/pkg/hono/app";
import { getCtxUser } from "@/pkg/lib/context";
import { z } from "@hono/zod-openapi";

const getProfileInfo200ResponseSchema = z.object({});

const route = createRouteConfig({
  tags: ["admin"],
  summary: "Get profile info of the admin",
  method: "get",
  path: "/v1/admin.getProfileInfo",
  guard: [isAuthenticated(), hasAdminAccess],
  operationId: "getProfileInfo",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "",
      content: {
        "application/json": {
          schema: successWithDataSchema(getProfileInfo200ResponseSchema),
        },
      },
    },
    ...errorResponses,
  },
});

export const registerV1ApiGetProfileInfo = (app: App) => {
  app.openapi(route, async (c) => {
    const admin = getCtxUser()!;
    const { db } = c.get("services");

    const adminProfile = await db.query.accounts.findFirst({
      columns: {
        publicId: true,
        email: true,
        firstName: true,
        lastName: true,
        mobile: true,
        role: true,
        createdAt: true,
      },
      where: (t, { eq }) => {
        return eq(t.publicId, admin.publicId);
      },
    });

    if (!adminProfile) {
      return errorResponse(c, "NOT_FOUND", "Admin not found") as any;
    }

    return c.json({ success: true, data: { ...adminProfile } }, 200);
  });
};
