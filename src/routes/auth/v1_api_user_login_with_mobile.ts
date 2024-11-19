import { isPublicAccess } from "@/middleware/guard";
import { errorResponses, successWithDataSchema } from "@/pkg/common/common-responses";
import { mobileNumberSchema } from "@/pkg/common/common-schemas";
import { createRouteConfig } from "@/pkg/common/route-config";
import { errorResponse } from "@/pkg/errors/http";
import type { App } from "@/pkg/hono/app";
import { getCtxDatabase, getCtxTenant } from "@/pkg/lib/context";
import { createLuciaSessionCookie } from "@/pkg/utils/session";
import { z } from "@hono/zod-openapi";
import { and } from "drizzle-orm";

const userLoginWithMobileRequestSchema = z.object({
  mobile: mobileNumberSchema,
});

const userLoginWithMobile200ResponseSchema = z.object({
  user: z.object({}),
  accessToken: z.string().openapi({
    default: "SflKxwRJSdsafdsfMeJf36POk6yJV_adQssw5c",
  }),
});

const route = createRouteConfig({
  tags: ["auth"],
  summary: "Login User with mobile",
  description: "Login User with mobile",
  method: "post",
  path: "/v1/auth.userLoginWithMobile",
  guard: isPublicAccess,
  operationId: "userLoginWithMobile",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: userLoginWithMobileRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "",
      content: {
        "application/json": {
          schema: successWithDataSchema(userLoginWithMobile200ResponseSchema),
        },
      },
    },
    ...errorResponses,
  },
});

export const registerV1ApiUserLoginWithMobile = (app: App) => {
  app.openapi(route, async (c) => {
    const tenant = getCtxTenant();
    const db = getCtxDatabase();
    const { mobile } = c.req.valid("json");

    const user = await db.query.accounts.findFirst({
      columns: {
        id: true,
        publicId: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
        role: true,
        mobile: true,
      },
      where: (t, { eq }) => and(eq(t.mobile, mobile), eq(t.tenantId, tenant.publicId)),
    });

    if (!user) {
      return errorResponse(c, "NOT_FOUND", "User not found");
    }

    const sessionCookie = await createLuciaSessionCookie(c, {
      accountId: user.id,
      publicId: user.publicId,
      role: user.role,
    });

    return c.json(
      {
        success: true,
        data: {
          user: {
            email: user.email,
            emailVerified: user.emailVerified,
            publicId: user.publicId,
            role: user.role,
            mobile: user.mobile,
          },
          accessToken: sessionCookie.value,
        },
      },
      200,
    );
  });
};
