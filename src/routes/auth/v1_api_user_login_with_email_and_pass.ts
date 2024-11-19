import { accounts } from "@/database/schema";
import { isPublicAccess } from "@/middleware/guard";
import { errorResponses, successWithDataSchema } from "@/pkg/common/common-responses";
import { createRouteConfig } from "@/pkg/common/route-config";
import { ApiError } from "@/pkg/errors/http";
import type { App } from "@/pkg/hono/app";
import { getCtxTenant } from "@/pkg/lib/context";
import { createLuciaSessionCookie } from "@/pkg/utils/session";
import { z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { Argon2id } from "oslo/password";

const userLoginWithEmailAndPassRequestSchema = z.object({
  email: z.string().email().openapi({
    default: "test@test.com",
  }),
  password: z.string().min(8).max(255).openapi({
    default: "password",
  }),
});

const userLoginWithEmailAndPass200ResponseSchema = z.object({
  user: z.object({}),
  accessToken: z.string().openapi({
    default: "SflKxwRJSdsafdsfMeJf36POk6yJV_adQssw5c",
  }),
});

const route = createRouteConfig({
  tags: ["auth"],
  summary: "Login User with email and password",
  method: "post",
  path: "/v1/auth.userLoginWithEmailAndPass",
  guard: isPublicAccess,
  operationId: "userLoginWithEmailAndPass",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: userLoginWithEmailAndPassRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "",
      content: {
        "application/json": {
          schema: successWithDataSchema(userLoginWithEmailAndPass200ResponseSchema),
        },
      },
    },
    ...errorResponses,
  },
});

export const registerV1ApiUserLoginWithEmailAndPass = (app: App) => {
  app.openapi(route, async (c) => {
    const tenant = getCtxTenant();
    const { email, password } = c.req.valid("json");
    const { db } = c.get("services");

    const userResponse = await db.query.accounts.findFirst({
      where: and(eq(accounts.email, email), eq(accounts.tenantId, tenant.publicId)),
      columns: {
        id: true,
        publicId: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
        role: true,
        mobile: true,
      },
    });

    if (!userResponse) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const validPassword = await new Argon2id().verify(userResponse.passwordHash, password);

    if (!validPassword) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const sessionCookie = await createLuciaSessionCookie(c, {
      accountId: userResponse.id,
      publicId: userResponse.publicId,
      role: userResponse.role,
    });

    return c.json(
      {
        success: true,
        data: {
          user: {
            email: userResponse.email,
            emailVerified: userResponse.emailVerified,
            publicId: userResponse.publicId,
            role: userResponse.role,
            mobile: userResponse.mobile,
          },
          accessToken: sessionCookie.value,
        },
      },
      200,
    );
  });
};
