import { isPublicAccess } from "@/middleware/guard";
import { errorResponses, successWithDataSchema } from "@/pkg/common/common-responses";
import { mobileNumberSchema } from "@/pkg/common/common-schemas";
import { createRouteConfig } from "@/pkg/common/route-config";
import type { App } from "@/pkg/hono/app";
import { getCtxTenant } from "@/pkg/lib/context";
import { z } from "@hono/zod-openapi";

const userCheckMobileRequestSchema = z.object({
  mobile: mobileNumberSchema,
});

const userCheckMobile200ResponseSchema = z.object({
  found: z.boolean(),
});

const route = createRouteConfig({
  tags: ["auth"],
  summary: "Check if mobile is already registered",
  description: "Check if mobile is already registered",
  method: "post",
  path: "/v1/auth.userCheckMobile",
  guard: isPublicAccess,
  operationId: "userCheckMobile",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: userCheckMobileRequestSchema,
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "",
      content: {
        "application/json": {
          schema: successWithDataSchema(userCheckMobile200ResponseSchema),
        },
      },
    },
    ...errorResponses,
  },
});

export const registerV1ApiUserCheckMobile = (app: App) => {
  app.openapi(route, async (c) => {
    const tenant = getCtxTenant();
    const { mobile } = c.req.valid("json");
    const db = c.get("services").db;

    const user = await db.query.accounts.findFirst({
      columns: {
        mobile: true,
      },
      where: (t, { eq, and }) => and(eq(t.mobile, mobile), eq(t.tenantId, tenant.publicId)),
    });

    if (!user) {
      return c.json({ success: true, data: { found: false } }, 200);
    }

    return c.json({ success: true, data: { found: true } }, 200);
  });
};
