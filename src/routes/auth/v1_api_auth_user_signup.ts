import { randomUUID } from "node:crypto";
import { accounts } from "@/database/schema";
import { isPublicAccess } from "@/middleware/guard";
import { errorResponses, successWithDataSchema } from "@/pkg/common/common-responses";
import { createRouteConfig } from "@/pkg/common/route-config";
import type { TErrorSchema } from "@/pkg/errors/http";
import type { App } from "@/pkg/hono/app";
import { getCtxTenant } from "@/pkg/lib/context";
import { formatMobileNumber, isMobileNumberValid } from "@/pkg/utils/phone-number";
import { typeIdGenerator } from "@/pkg/utils/typeid";
import { z } from "@hono/zod-openapi";
import { and, count, eq, or } from "drizzle-orm";
import { Argon2id } from "oslo/password";

const userSignupWithEmailRequestSchema = z.object({
  firstName: z.string().min(1).max(255).openapi({
    default: "John",
    description: "First name of the user",
  }),
  lastName: z.string().min(1).max(255).optional().openapi({
    default: "Doe",
    description: "Last name of the user",
  }),
  email: z.string().email().optional().openapi({
    default: "test@test.com",
    description: "Email of the user",
  }),
  password: z.string().min(8).max(255).optional().openapi({
    default: "password",
    description: "Password of the user must be at least 8 characters",
  }),
  mobile: z
    .string()
    .min(10)
    .max(20)
    .refine(
      (value) => {
        return isMobileNumberValid(value);
      },
      {
        message: "Invalid phone number",
      },
    )
    .transform((value) => {
      return formatMobileNumber(value);
    })
    .openapi({
      default: "+911234567890",
      description: "Mobile number of the user",
    }),
});

const userSignupWithEmail200ResponseSchema = z.object({
  user: z.object({}),
});

const route = createRouteConfig({
  tags: ["auth"],
  method: "post",
  path: "/v1/auth.userSignupWithEmailOrMobile",
  guard: isPublicAccess,
  operationId: "userSignupWithEmail",
  summary: "Signup User with email",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: userSignupWithEmailRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "User signed up successfully",
      content: {
        "application/json": {
          schema: successWithDataSchema(userSignupWithEmail200ResponseSchema),
        },
      },
    },
    ...errorResponses,
  },
});

export const registerV1ApiAuthUserSignup = (app: App) => {
  app.openapi(route, async (c) => {
    const tenant = getCtxTenant();
    const input = c.req.valid("json");
    const { db } = c.get("services");

    const [exits = { count: 0 }] = await db
      .select({
        count: count(accounts.id),
      })
      .from(accounts)
      .where(
        and(
          or(
            input.email ? eq(accounts.email, input.email) : undefined,
            eq(accounts.mobile, input.mobile),
          ),
          eq(accounts.tenantId, tenant.publicId),
        ),
      );

    if (exits?.count > 0) {
      return c.json<TErrorSchema, 400>(
        {
          success: false,
          error: {
            message: "User already exists with this email or mobile",
            code: "NOT_UNIQUE",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const response = await db.transaction(async (trx) => {
      const passwordHash = await new Argon2id().hash(input.password || randomUUID());
      const publicId = typeIdGenerator("account");

      const [user] = await trx
        .insert(accounts)
        // TODO: add tenantId
        .values({
          passwordHash,
          publicId,
          email: input?.email || `${input.mobile}@example.com`,
          firstName: input.firstName,
          lastName: input.lastName,
          mobile: input.mobile,
          tenantId: typeIdGenerator("tenant"),
        })
        .returning({
          id: accounts.id,
          publicId: accounts.publicId,
          role: accounts.role,
        });

      return user;
    });

    if (!response) {
      return c.json<TErrorSchema, 500>(
        {
          success: false,
          error: {
            message: "Failed to create user",
            code: "INTERNAL_SERVER_ERROR",
          },
          requestId: c.get("requestId"),
        },
        500,
      );
    }

    // const sessionCookie = await createLuciaSessionCookie(c, {
    //   accountId: response.id,
    //   publicId: response.publicId,
    //   role: response.role,
    // });

    return c.json(
      {
        success: true,
        data: {
          user: {
            email: input.email,
            emailVerified: false,
            publicId: response.publicId,
            role: response.role,
            mobile: input.mobile,
          },
        },
      },
      200,
    );
  });
};
